import { NODES } from '../simulation/network-data';
import type { Simulation } from '../simulation/Simulation';
import type { NetworkScene } from './NetworkScene';
/** Geographic pins and camera-independent route geometry for Earth view only. */
export class GlobeRoutes {
  scene: NetworkScene;
  paths = new Map<number, { samples: number[][]; lengths: number[]; total: number }>();

  constructor(scene: NetworkScene) {
    this.scene = scene;
  }
  pin(index: number) {
    const node = NODES[index];
    // Local equipment is lifted just above its city so device, NAT/PAT and ISP are separate clickable dots.
    const radius = index === 9 ? 1.004 : 1 + node.h;
    return this.scene.project(this.scene.xyz(node.lat, node.lon, radius));
  }
  waypoints(edge: number) {
    const start = NODES[edge],
      end = NODES[edge + 1];
    // Illustrative transit corridors: north into the US, south from the relay.
    // Waypoints change the drawn cable path, never city or router coordinates.
    const corridors: Record<number, number[][]> = {
      4: [
        [51, -53],
        [49, -70],
      ],
      5: [
        [43, -100],
        [46, -111],
      ],
      6: [
        [36, -116],
        [30, -104],
        [32, -91],
      ],
    };
    return [[start.lat, start.lon], ...(corridors[edge] || []), [end.lat, end.lon]];
  }
  sample(edge: number) {
    const cached = this.paths.get(edge);
    if (cached) return cached;
    const waypoints = this.waypoints(edge),
      samples: number[][] = [],
      lengths = [0];
    const radius = (index: number) => (index === 9 ? 1.004 : 1 + NODES[index].h);
    const startRadius = radius(edge),
      endRadius = radius(edge + 1);
    const count = 128;
    for (let index = 0; index <= count; index++) {
      const progress = index / count,
        position = progress * (waypoints.length - 1);
      const segment = Math.min(waypoints.length - 2, Math.floor(position)),
        t = position - segment;
      const p0 = waypoints[Math.max(0, segment - 1)],
        p1 = waypoints[segment],
        p2 = waypoints[segment + 1],
        p3 = waypoints[Math.min(waypoints.length - 1, segment + 2)];
      const interpolate = (axis: number) =>
        0.5 *
        (2 * p1[axis] +
          (-p0[axis] + p2[axis]) * t +
          (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t * t +
          (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t * t * t);
      const sample = this.scene.xyz(
        interpolate(0),
        interpolate(1),
        startRadius + (endRadius - startRadius) * progress,
      );
      if (index)
        lengths.push(
          lengths[index - 1] +
            Math.hypot(...sample.map((value, axis) => value - samples[index - 1][axis])),
        );
      samples.push(sample);
    }
    const path = { samples, lengths, total: lengths[lengths.length - 1] };
    this.paths.set(edge, path);
    return path;
  }
  position(from: number, to: number, progress: number) {
    if (progress <= 0) return this.pin(from);
    if (progress >= 1) return this.pin(to);
    if (from === to) return this.pin(from);
    const edge = Math.min(from, to),
      u = from < to ? progress : 1 - progress,
      path = this.sample(edge);
    if (path.total < 1e-8) return this.pin(from);
    const target = path.total * u;
    let low = 1,
      high = path.lengths.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (path.lengths[middle] < target) low = middle + 1;
      else high = middle;
    }
    const index = low,
      span = path.lengths[index] - path.lengths[index - 1],
      fraction = span ? (target - path.lengths[index - 1]) / span : 0;
    const a = path.samples[index - 1],
      b = path.samples[index];
    return this.scene.project(a.map((value, axis) => value + (b[axis] - value) * fraction));
  }
}

export class GlobeLabels {
  scene: NetworkScene;
  boxes: Array<{ x: number; y: number; w: number; h: number }> = [];

  constructor(scene: NetworkScene) {
    this.scene = scene;
  }
  draw(state: { sim: Simulation; selectedId: string | null; selectedNode: number }) {
    const scene = this.scene,
      ctx = scene.ctx;
    this.boxes = [];
    const definitions = [
      {
        index: 0,
        name: 'TEL AVIV DEVICE',
        detail: '01 · Your phone / laptop / tablet',
        primary: true,
      },
      {
        index: 1,
        name: 'NAT / PAT',
        detail: '02 · Building gateway · 203.0.113.10',
        primary: true,
      },
      { index: 2, name: 'ISRAELI ISP', detail: '03 · Provider edge', primary: true },
      { index: 6, name: 'US WEST RELAY', detail: '07 · Secure relay', primary: true },
      { index: 7, name: 'RECIPIENT ISP', detail: '08 · Provider edge', primary: true },
      {
        index: 8,
        name: 'RECIPIENT NAT / PAT',
        detail: '09 · Gateway · 203.0.113.80',
        primary: true,
      },
      { index: 9, name: 'NEW YORK DEVICE', detail: '10 · Recipient phone', primary: true },
      { index: 3, name: 'MARSEILLE', detail: '04 · European transit' },
      { index: 4, name: 'ATLANTIC', detail: '05 · Backbone' },
      { index: 5, name: 'US TRANSIT', detail: '06 · Backbone' },
    ];
    const routePoints = NODES.map((_node, index) => scene.nodePosition(index)).filter(
      (point) => point.visible,
    );
    for (let edge = 0; edge < 9; edge++)
      for (let j = 1; j < 20; j++) {
        const point = scene.pathPosition(edge, edge + 1, j / 20);
        if (point.visible) routePoints.push(point);
      }
    for (const definition of definitions) {
      const pin = scene.nodePosition(definition.index);
      if (!pin.visible || pin.x < 8 || pin.x > scene.w - 8 || pin.y < 65 || pin.y > scene.h - 90)
        continue;
      const selected =
        state.selectedNode === definition.index ||
        (definition.index === 0 && state.selectedNode === 1) ||
        (definition.index === 9 && state.selectedNode === 8);
      const color =
        definition.index === 6 ? '#ffbc75' : definition.index >= 7 ? '#c6b4f7' : '#80e7d2';
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, definition.primary ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1725';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (selected) {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      scene.hits.push({ type: 'node', id: definition.index, x: pin.x, y: pin.y, r: 15 });
      ctx.font = '600 12px "DM Sans Variable",sans-serif';
      const detail = definition.primary || selected ? definition.detail : null;
      const width =
          Math.max(
            ctx.measureText(definition.name).width,
            detail ? ctx.measureText(detail).width : 0,
          ) + 20,
        height = detail ? 43 : 27;
      const candidates = [
        [16, -height - 10],
        [16, 12],
        [-width - 16, -height - 10],
        [-width - 16, 12],
        [-width / 2, -height - 20],
        [-width / 2, 20],
        [24, -height / 2],
        [-width - 24, -height / 2],
      ];
      let chosen = null,
        best = Infinity;
      for (const [dx, dy] of candidates) {
        const box = { x: pin.x + dx, y: pin.y + dy, w: width, h: height };
        if (
          box.x < 8 ||
          box.x + width > scene.w - 8 ||
          box.y < 75 ||
          box.y + height > scene.h - 100
        )
          continue;
        if (
          this.boxes.some(
            (other) =>
              box.x < other.x + other.w + 8 &&
              box.x + box.w + 8 > other.x &&
              box.y < other.y + other.h + 6 &&
              box.y + box.h + 6 > other.y,
          )
        )
          continue;
        const intersections = routePoints.filter(
          (point) =>
            point.x > box.x - 3 &&
            point.x < box.x + width + 3 &&
            point.y > box.y - 3 &&
            point.y < box.y + height + 3,
        ).length;
        const score = intersections * 100 + Math.hypot(dx, dy);
        if (score < best) {
          best = score;
          chosen = box;
        }
      }
      if (chosen && (best < 100 || selected || definition.primary)) {
        this.boxes.push(chosen);
        const anchorX = Math.max(chosen.x, Math.min(chosen.x + width, pin.x)),
          anchorY = Math.max(chosen.y, Math.min(chosen.y + height, pin.y));
        ctx.beginPath();
        ctx.moveTo(pin.x, pin.y);
        ctx.lineTo(anchorX, anchorY);
        ctx.strokeStyle = `${color}66`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(chosen.x, chosen.y, width, height, 6);
        ctx.fillStyle = '#091522ee';
        ctx.fill();
        ctx.strokeStyle = `${color}44`;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fillText(definition.name, chosen.x + 10, chosen.y + 17);
        if (detail) {
          ctx.font = '11px "DM Sans Variable",sans-serif';
          ctx.fillStyle = '#a6bacb';
          ctx.fillText(detail, chosen.x + 10, chosen.y + 33);
        }
        scene.hits.push({
          type: 'node',
          id: definition.index,
          x: chosen.x + width / 2,
          y: chosen.y + height / 2,
          r: height / 2,
        });
      }
      ctx.restore();
    }
  }
}
