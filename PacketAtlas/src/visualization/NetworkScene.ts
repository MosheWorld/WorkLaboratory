import { CONTINENTS } from './geography';
import { DEVICES, NODES } from '../simulation/network-data';
import type { Packet } from '../simulation/types';
import type { Simulation } from '../simulation/Simulation';
import { GlobeLabels, GlobeRoutes } from './GlobeRoutes';
import { DeviceVisuals } from './DeviceVisuals';
import { bindSceneInput } from './SceneInput';

type SceneHit = ({ type: 'packet'; id: string } | { type: 'node'; id: number }) & {
  x: number;
  y: number;
  r: number;
};

export type SceneView = 'globe' | 'path' | 'lan';

type ScenePoint = { x: number; y: number; z: number; visible: boolean };

export class NetworkScene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  getState: () => { sim: Simulation; selectedId: string | null; selectedNode: number };
  selectPacket: (id: string) => void;
  selectNode: (index: number) => void;
  view: SceneView = 'globe';
  zoom = 1;
  yaw = 0.65;
  pitch = 0.9;
  pan = { x: 0, y: 0 };
  hits: SceneHit[] = [];
  pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  followId: string | null = null;
  earth: number[][] = [];
  globeRoutes: GlobeRoutes;
  globeLabels: GlobeLabels;
  onResize: () => void;
  onCamera?: () => void;
  w = 0;
  h = 0;
  background?: HTMLCanvasElement;
  backgroundKey?: string;
  dragMoved = false;
  private readonly inputEvents = new AbortController();

  constructor(
    canvas: HTMLCanvasElement,
    getState: NetworkScene['getState'],
    selectPacket: NetworkScene['selectPacket'],
    selectNode: NetworkScene['selectNode'],
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The network visualization requires a 2D canvas context.');
    this.ctx = context;
    this.getState = getState;
    this.selectPacket = selectPacket;
    this.selectNode = selectNode;
    this.view = 'globe';
    this.zoom = 1;
    this.yaw = 0.65;
    this.pitch = 0.9;
    this.pan = { x: 0, y: 0 };
    this.hits = [];
    this.pointers = new Map();
    this.followId = null;
    this.earth = [];
    for (let lat = -60; lat < 80; lat += 3)
      for (let lon = -178; lon < 180; lon += 3) {
        if (CONTINENTS.some((poly) => this.inside(lon, lat, poly)))
          this.earth.push(this.xyz(lat, lon, 1.004));
      }
    this.globeRoutes = new GlobeRoutes(this);
    this.globeLabels = new GlobeLabels(this);
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    bindSceneInput(this, this.inputEvents.signal);
  }
  destroy() {
    this.inputEvents.abort();
    window.removeEventListener('resize', this.onResize);
  }
  inside(x: number, y: number, poly: number[][]) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i],
        [yj, xj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    const d = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.w * d;
    this.canvas.height = this.h * d;
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  xyz(lat: number, lon: number, r = 1) {
    lat *= Math.PI / 180;
    lon *= Math.PI / 180;
    return [
      r * Math.cos(lat) * Math.sin(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.cos(lon),
    ];
  }
  project(v: number[]) {
    let x = v[0] * Math.cos(this.yaw) + v[2] * Math.sin(this.yaw),
      z = -v[0] * Math.sin(this.yaw) + v[2] * Math.cos(this.yaw),
      y = v[1] * Math.cos(this.pitch) - z * Math.sin(this.pitch);
    z = v[1] * Math.sin(this.pitch) + z * Math.cos(this.pitch);
    const scale = (Math.min(this.w * 0.38, this.h * 0.38) * this.zoom * 3.8) / (3.8 - z);
    const A = x * x + y * y + (z - 3.8) * (z - 3.8),
      B = 7.6 * (z - 3.8),
      C = 3.8 * 3.8 - 1,
      disc = B * B - 4 * A * C;
    const visible = disc < 0 || (-B - Math.sqrt(Math.max(0, disc))) / (2 * A) >= 0.9999;
    return {
      x: this.w / 2 + this.pan.x + x * scale,
      y: this.h * 0.5 + this.pan.y - y * scale,
      z,
      visible,
    };
  }
  nodePosition(i: number) {
    if (this.view === 'globe') return this.globeNodePosition(i);
    if (this.view === 'path') {
      const layout = [
        [0.1, 0.25],
        [0.36, 0.25],
        [0.62, 0.25],
        [0.88, 0.25],
        [0.88, 0.46],
        [0.62, 0.46],
        [0.36, 0.46],
        [0.36, 0.68],
        [0.62, 0.68],
        [0.88, 0.68],
      ];
      const [x, y] = layout[i];
      return {
        x: (x - 0.5) * this.w * this.zoom + this.w / 2 + this.pan.x,
        y: (y - 0.5) * this.h * this.zoom + this.h / 2 + this.pan.y,
        z: 1,
        visible: true,
      };
    }
    const positions: Record<number, number[]> = {
      0: [0.18, 0.34],
      1: [0.56, 0.5],
      2: [0.76, 0.5],
      6: [0.9, 0.5],
    };
    const [x, y] = positions[i] || [0.85, 0.5];
    return {
      x: (x - 0.5) * this.w * this.zoom + this.w / 2 + this.pan.x,
      y: (y - 0.5) * this.h * this.zoom + this.h / 2 + this.pan.y,
      z: 1,
      visible: positions[i] !== undefined,
    };
  }
  packetPosition(p: Packet) {
    const t = this.getState().sim.time;
    const u = Math.max(0, Math.min(1, (t - p.start) / p.duration));
    const f = u * (p.route.length - 1),
      idx = Math.min(p.route.length - 2, Math.floor(f)),
      a = p.route[idx],
      b = p.route[idx + 1];
    return this.pathPosition(a, b, f - idx);
  }
  globeNodePosition(index: number) {
    return this.globeRoutes.pin(index);
  }
  pathPosition(a: number, b: number, u: number) {
    if (this.view === 'globe') return this.globeRoutes.position(a, b, u);
    const pa = this.nodePosition(a),
      pb = this.nodePosition(b);
    return {
      x: pa.x + (pb.x - pa.x) * u,
      y: pa.y + (pb.y - pa.y) * u,
      z: 1,
      visible: pa.visible && pb.visible,
    };
  }

  line(
    a: number,
    b: number,
    color: string,
    width = 1.8,
    { arrow = false }: { arrow?: boolean } = {},
  ) {
    const c = this.ctx,
      points = Array.from({ length: 61 }, (_, index) => this.pathPosition(a, b, index / 60));
    c.beginPath();
    let connected = false;
    for (const point of points) {
      if (!point.visible) {
        connected = false;
        continue;
      }
      if (connected) c.lineTo(point.x, point.y);
      else c.moveTo(point.x, point.y);
      connected = true;
    }
    c.strokeStyle = '#06101bd0';
    c.lineWidth = width + 3;
    c.stroke();
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
    if (arrow && points[34].visible && points[35].visible)
      this.arrow(points[34], points[35], color);
  }

  arrow(from: ScenePoint, to: ScenePoint, color: string) {
    const c = this.ctx,
      angle = Math.atan2(to.y - from.y, to.x - from.x);
    c.save();
    c.translate(to.x, to.y);
    c.rotate(angle);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-8, -4);
    c.lineTo(-8, 4);
    c.closePath();
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 0;
    c.fill();
    c.restore();
  }
  drawRoute() {
    if (this.view === 'lan') {
      [
        [0, 1],
        [1, 2],
        [2, 6],
      ].forEach(([a, b], index) => {
        this.line(a, b, '#73efd7a8', 2, { arrow: index === 0 });
      });
      return;
    }
    for (let i = 0; i < 9; i++) {
      const secondLeg = i >= 6,
        color = secondLeg ? '#ffbc75d0' : '#73efd7c0';
      this.line(i, i + 1, color, 2.2, { arrow: i === 3 || i === 7 });
    }
  }
  sphere() {
    const key = [this.w, this.h, this.zoom, this.yaw, this.pitch, this.pan.x, this.pan.y].join('|');
    let background = this.background;
    if (!background) {
      background = document.createElement('canvas');
      this.background = background;
    }
    if (key !== this.backgroundKey) {
      const d = Math.min(devicePixelRatio || 1, 2);
      background.width = this.w * d;
      background.height = this.h * d;
      const context = background.getContext('2d');
      if (!context) throw new Error('The globe background requires a 2D canvas context.');
      context.setTransform(d, 0, 0, d, 0, 0);
      this.sphereGeometry(context);
      this.backgroundKey = key;
    }
    this.ctx.drawImage(background, 0, 0, this.w, this.h);
  }
  sphereGeometry(c: CanvasRenderingContext2D) {
    const w = this.w,
      h = this.h,
      R = Math.min(w * 0.38, h * 0.38) * this.zoom,
      x = w / 2 + this.pan.x,
      y = h * 0.5 + this.pan.y;
    const glow = c.createRadialGradient(x, y, R * 0.7, x, y, R * 1.5);
    glow.addColorStop(0, '#26547440');
    glow.addColorStop(0.75, '#24567718');
    glow.addColorStop(1, '#0a111900');
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    const g = c.createRadialGradient(x - R * 0.35, y - R * 0.4, 0, x, y, R * 1.04);
    g.addColorStop(0, '#1b3d54');
    g.addColorStop(0.55, '#102a3b');
    g.addColorStop(1, '#07121e');
    c.beginPath();
    c.arc(x, y, R * 1.036, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = '#407a9655';
    c.lineWidth = 1.5;
    c.stroke();
    const surface = (coords: number[][], color: string) => {
      c.beginPath();
      let prev = false;
      for (const v of coords) {
        const p = this.project(v);
        if (p.visible) {
          prev ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
          prev = true;
        } else prev = false;
      }
      c.strokeStyle = color;
      c.lineWidth = 0.7;
      c.stroke();
    };
    for (let lat = -75; lat <= 75; lat += 15)
      surface(
        Array.from({ length: 121 }, (_, i) => this.xyz(lat, i * 3 - 180)),
        '#6899b012',
      );
    for (let lon = -180; lon < 180; lon += 15)
      surface(
        Array.from({ length: 61 }, (_, i) => this.xyz(i * 3 - 90, lon)),
        '#6899b012',
      );
    for (const land of CONTINENTS) {
      const coords = [];
      for (let i = 0; i < land.length - 1; i++) {
        const a = land[i],
          b = land[i + 1],
          n = Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]));
        for (let j = 0; j < n; j++)
          coords.push(
            this.xyz(a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n, 1.004),
          );
      }
      surface(coords, '#7099ac65');
    }
    for (const v of this.earth) {
      const p = this.project(v);
      if (p.visible) {
        c.fillStyle = `rgba(123,186,185,${0.06 + p.z * 0.12})`;
        c.fillRect(p.x, p.y, Math.max(1, this.zoom * 1.25), Math.max(1, this.zoom * 1.25));
      }
    }
  }
  draw() {
    const { sim, selectedId, selectedNode } = this.getState();
    this.followSelectedPacket(sim);
    this.drawBackground();
    if (this.view === 'lan') this.lanBackdrop(sim);
    this.drawRoute();
    if (this.view === 'globe') this.globeLabels.draw({ sim, selectedId, selectedNode });
    if (this.view !== 'globe') this.drawNodes(sim, selectedNode);
    this.drawPackets(sim, selectedId);
    this.drawRecentLosses(sim);
  }
  private followSelectedPacket(simulation: Simulation) {
    if (!this.followId) return;
    const followedPacket = simulation.packets.find((packet) => packet.id === this.followId);
    if (followedPacket?.status !== 'in flight') {
      this.followId = null;
      return;
    }
    const position = this.packetPosition(followedPacket);
    this.pan.x += (this.w / 2 - position.x) * 0.1;
    this.pan.y += (this.h * 0.48 - position.y) * 0.1;
  }
  private drawBackground() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.hits = [];
    if (this.view === 'globe') {
      this.drawStarfield();
      this.sphere();
      return;
    }
    this.drawGrid();
  }
  private drawStarfield() {
    const context = this.ctx;
    for (let i = 0; i < 70; i++) {
      context.fillStyle = i % 3 ? '#84a8cb20' : '#84a8cb45';
      context.fillRect((i * 131.3) % this.w, (i * 79.7) % this.h, 1, 1);
    }
  }
  private drawGrid() {
    const context = this.ctx;
    context.strokeStyle = '#28415b26';
    context.lineWidth = 1;
    for (let x = 0; x < this.w; x += 40) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.h);
      context.stroke();
    }
    for (let y = 0; y < this.h; y += 40) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.w, y);
      context.stroke();
    }
  }
  private drawNodes(sim: Simulation, selectedNode: number) {
    const c = this.ctx;
    const occupied: Array<{ x: number; y: number }> = [];
    NODES.forEach((n, i) => {
      const p = this.nodePosition(i);
      if (!p.visible || p.x < 0 || p.x > this.w || p.y < 65 || p.y > this.h - 75) return;
      const color = i === 6 ? '#ffbc75' : i === 9 ? '#bda1ff' : '#73efd7';
      if (this.view === 'globe' && i < 4) {
        const base = this.project(this.xyz(n.lat, n.lon));
        c.beginPath();
        c.moveTo(base.x, base.y);
        c.lineTo(p.x, p.y);
        c.strokeStyle = `${color}45`;
        c.stroke();
      }
      if (this.view === 'lan' && i === 0)
        DeviceVisuals.draw(
          c,
          (['phone', 'laptop', 'tablet'] as const)[DEVICES.indexOf(sim.device)],
          p.x,
          p.y,
          { active: true, scale: 1.2 },
        );
      else {
        c.beginPath();
        c.arc(p.x, p.y, i === 6 ? 12 : 6, 0, Math.PI * 2);
        c.fillStyle = '#0b1925';
        c.strokeStyle = color;
        c.lineWidth = i === 6 ? 2.5 : 1.8;
        c.fill();
        c.stroke();
        c.beginPath();
        c.arc(p.x, p.y, i === 6 ? 5 : 2.5, 0, Math.PI * 2);
        c.fillStyle = color;
        c.shadowColor = color;
        c.shadowBlur = 12;
        c.fill();
        c.shadowBlur = 0;
      }
      if (this.view === 'path') {
        c.font = '11px monospace';
        c.fillStyle = '#d9e7f0';
        c.fillText(String(i + 1).padStart(2, '0'), p.x + 13, p.y + 4);
      }
      if (i === selectedNode) {
        c.beginPath();
        c.arc(p.x, p.y, 22, 0, Math.PI * 2);
        c.strokeStyle = `${color}70`;
        c.lineWidth = 1;
        c.stroke();
      }
      this.hits.push({ type: 'node', id: i, x: p.x, y: p.y, r: 22 });
      let tx = p.x + 14,
        ty = p.y - 18;
      if (i === 6) {
        tx = p.x - 70;
        ty = p.y - 36;
      }
      if (i === 9) {
        tx = p.x - 45;
        ty = p.y + 30;
      }
      if (i === 0) {
        tx = p.x + 20;
        ty = p.y + 4;
      }
      if (this.view === 'globe' && [7, 8].includes(i)) {
        tx = p.x - 40;
        ty = p.y + 30;
      }
      if (this.view === 'path') {
        tx = p.x - 40;
        ty = p.y + (i <= 3 ? -28 : 32);
        if (i === 6) {
          tx = p.x - 125;
          ty = p.y + 4;
        }
      }
      tx = Math.max(12, Math.min(this.w - 120, tx));
      ty = Math.max(90, Math.min(this.h - 110, ty));
      let tries = 0;
      while (
        occupied.some((b) => Math.abs(tx - b.x) < 115 && Math.abs(ty - b.y) < 33) &&
        tries++ < 8
      )
        ty += 34;
      occupied.push({ x: tx, y: ty });
      if (this.view !== 'path') {
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(tx, ty - 4);
        c.strokeStyle = `${color}25`;
        c.lineWidth = 1;
        c.stroke();
      }
      c.font = '600 11px "DM Sans Variable",sans-serif';
      c.fillStyle = color;
      c.fillText(i === 0 && this.view === 'lan' ? sim.device.name.toUpperCase() : n.short, tx, ty);
      c.font = '10px monospace';
      c.fillStyle = '#91a9bd';
      if (this.view !== 'path' || this.w > 850 || i === selectedNode)
        c.fillText(
          i === 0
            ? this.view === 'lan'
              ? `${sim.device.ip}:${sim.device.port}`
              : sim.device.ip
            : n.ip,
          tx,
          ty + 15,
        );
    });
  }
  private drawPackets(sim: Simulation, selectedId: string | null) {
    const c = this.ctx;
    const live = sim.packets.filter((p) => p.status === 'in flight');
    for (const p of live) {
      const pos = this.packetPosition(p);
      if (!pos.visible) continue;
      const selected = p.id === selectedId,
        color =
          p.kind === 'DATA'
            ? '#73efd7'
            : p.kind === 'ARP' || p.kind === 'DNS' || p.kind === 'TCP'
              ? '#83bfff'
              : '#c5a7ff';
      const u = (sim.time - p.start) / p.duration;
      for (let j = 1; j < 5; j++) {
        const uu = Math.max(0, u - j * 0.008),
          f = uu * (p.route.length - 1),
          idx = Math.min(p.route.length - 2, Math.floor(f)),
          trail = this.pathPosition(p.route[idx], p.route[idx + 1], f - idx);
        if (trail.visible) {
          c.beginPath();
          c.arc(trail.x, trail.y, Math.max(0.7, 3 - j * 0.25), 0, Math.PI * 2);
          c.fillStyle = color;
          c.globalAlpha = (1 - j / 10) * 0.5;
          c.fill();
        }
      }
      c.globalAlpha = 1;
      c.save();
      c.translate(pos.x, pos.y);
      c.rotate(Math.PI / 4);
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 0;
      c.fillRect(-4, -4, 8, 8);
      c.restore();
      if (selected) {
        c.beginPath();
        c.arc(pos.x, pos.y, 13, 0, Math.PI * 2);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;
        c.stroke();
      }
      this.hits.unshift({ type: 'packet', id: p.id, x: pos.x, y: pos.y, r: 18 });
      c.font = '11px monospace';
      c.fillStyle = selected ? '#fff' : color;
      if (this.view !== 'globe' || selected)
        c.fillText(
          p.id + (p.chunk !== undefined ? ` · #${p.chunk + 1}` : ''),
          pos.x + 12,
          pos.y - 10,
        );
    }
  }
  private drawRecentLosses(sim: Simulation) {
    const c = this.ctx;
    for (const p of sim.packets) {
      const lossTime = p.lossTime;
      if (lossTime === undefined || sim.time - lossTime >= 2) continue;
      const age = sim.time - lossTime,
        pos = this.pathPosition(
          p.route[p.hop],
          p.route[Math.min(p.hop + 1, p.route.length - 1)],
          0.2,
        );
      c.globalAlpha = 1 - age / 2;
      c.strokeStyle = '#ff7187';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(pos.x, pos.y, 10 + age * 20, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#ff7187';
      c.font = '12px monospace';
      c.fillText(`${p.id} LOST`, pos.x + 15, pos.y);
      c.globalAlpha = 1;
    }
  }
  lanBackdrop(sim: Simulation) {
    const c = this.ctx,
      px = (n: number) => (n - 0.5) * this.w * this.zoom + this.w / 2 + this.pan.x,
      py = (n: number) => (n - 0.5) * this.h * this.zoom + this.h / 2 + this.pan.y;
    const x = px(0.06),
      y = py(0.16),
      w = this.w * 0.57 * this.zoom,
      h = this.h * 0.66 * this.zoom;
    c.fillStyle = '#12322f30';
    c.strokeStyle = '#73efd735';
    c.lineWidth = 1;
    c.fillRect(x, y, w, h);
    c.strokeRect(x, y, w, h);
    c.font = '12px "DM Sans Variable",sans-serif';
    c.fillStyle = '#7de9d2';
    c.fillText('TEL AVIV BUILDING · 192.168.1.0/24', x + 16, y + 24);
    const gateway = this.nodePosition(1),
      others = DEVICES.filter((d) => d.ip !== sim.device.ip);
    others.forEach((d, index) => {
      const originalIndex = DEVICES.indexOf(d),
        dx = px(0.18),
        dy = py(0.56 + index * 0.16);
      c.beginPath();
      c.moveTo(dx + 20, dy);
      c.lineTo(gateway.x, gateway.y);
      c.strokeStyle = '#73efd740';
      c.lineWidth = 1.4;
      c.stroke();
      DeviceVisuals.draw(c, (['phone', 'laptop', 'tablet'] as const)[originalIndex], dx, dy, {
        active: false,
      });
      c.fillStyle = '#b6c9d5';
      c.font = '600 12px "DM Sans Variable",sans-serif';
      c.fillText(d.name, dx + 26, dy - 4);
      c.font = '11px monospace';
      c.fillStyle = '#91a9bd';
      c.fillText(`${d.ip}:${d.port}`, dx + 26, dy + 13);
    });
    c.fillStyle = '#93aabe';
    c.font = '12px "DM Sans Variable",sans-serif';
    c.fillText('PUBLIC INTERNET', px(0.72), py(0.68));
  }
  setView(v: SceneView) {
    this.view = v;
    this.fit();
  }
  fit() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.yaw = 0.65;
    this.pitch = 0.9;
    this.followId = null;
    this.onCamera?.();
  }
  setZoom(z: number) {
    this.zoom = Math.min(5, Math.max(0.4, z));
    this.onCamera?.();
  }
  focus(where: string) {
    this.fit();
    if (where === 'all') return;
    this.view = 'globe';
    const i = where === 'israel' ? 0 : where === 'relay' ? 6 : 9,
      n = NODES[i];
    this.yaw = (-n.lon * Math.PI) / 180;
    this.pitch = (n.lat * Math.PI) / 180;
    this.zoom = 2.2;
    this.onCamera?.();
  }
}
