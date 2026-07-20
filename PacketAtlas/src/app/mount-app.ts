import { ConceptVisuals } from '../visualization/ConceptVisuals';
import { CONCEPTS } from './concepts';
import { MODEL_BOUNDARIES_HTML } from './model-boundaries';
import { escapeHtml, getElement } from './dom';
import { Simulation } from '../simulation/Simulation';
import type { Protocol } from '../simulation/types';
import { NetworkScene, type SceneView } from '../visualization/NetworkScene';
import { renderPacketInspector, renderPacketRows } from './packet-inspector';
import { renderHopPanel, renderNatTable, renderReceiverBuffer } from './network-panels';
import { SimulationTimeline } from '../simulation/SimulationTimeline';
export function mountPacketAtlas() {
  let sim = new Simulation(),
    selectedId: string | null = null,
    selectedNode = 0,
    snapshotIndex: number | null = null,
    lastRevision = -1,
    lastRender = 0,
    previousSceneKey = '';
  let timeline = new SimulationTimeline(sim);
  const scene = new NetworkScene(
    getElement<HTMLCanvasElement>('globe'),
    () => ({ sim, selectedId, selectedNode }),
    selectPacket,
    selectNode,
  );
  scene.onCamera = () => {
    getElement('viewHint').textContent =
      scene.view === 'globe'
        ? 'Geographic city pins · Illustrative routes · Drag to orbit · Scroll to zoom'
        : scene.view === 'path'
          ? 'Schematic route, not geographic positions · Drag to pan · Click a packet to inspect'
          : 'Local network · Drag to pan · Scroll to zoom';
    getElement<HTMLInputElement>('zoom').value = String(Math.round(scene.zoom * 100));
    getElement('zoomLabel').textContent = `${Math.round(scene.zoom * 100)}%`;
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((viewButton) => {
      const active = viewButton.dataset.view === scene.view;
      viewButton.classList.toggle('active', active);
      viewButton.setAttribute('aria-pressed', String(active));
    });
    previousSceneKey = '';
  };
  const phases = [
    'Ready',
    'ARP / local link',
    'DNS lookup',
    'Transport',
    'Security',
    'Payloads',
    'Complete',
  ];
  let activePanel = 'list';
  function showPanel(which: 'list' | 'packet' | 'hop') {
    activePanel = which;
    for (const name of ['list', 'packet', 'hop']) {
      const selected = name === which;
      getElement(`${name}Panel`).hidden = !selected;
      getElement(`${name}Tab`).classList.toggle('active', selected);
      getElement(`${name}Tab`).setAttribute('aria-selected', String(selected));
      getElement(`${name}Tab`).tabIndex = selected ? 0 : -1;
    }
    if (which === 'list') renderPacketRows(sim, selectedId);
  }

  function stepTimeline(direction: number) {
    sim = timeline.step(direction);
    snapshotIndex = null;
    scene.followId = null;
    if (!sim.packets.some((p) => p.id === selectedId)) selectedId = null;
    lastRevision = -1;
    previousSceneKey = '';
    render(true);
  }
  function selectPacket(id: string) {
    selectedId = id;
    snapshotIndex = null;
    sim.paused = sim.running;
    scene.followId = null;
    showPanel('packet');
    render(true);
  }
  function selectNode(nodeIndex: number) {
    selectedNode = nodeIndex;
    showPanel('hop');
    renderHopPanel(selectedNode, sim);
  }
  function reset(protocol: Protocol = sim.protocol) {
    sim = new Simulation(protocol, +getElement<HTMLSelectElement>('sender').value);
    selectedId = null;
    snapshotIndex = null;
    scene.followId = null;
    lastRevision = -1;
    timeline = new SimulationTimeline(sim);
    for (const name of ['tcp', 'udp']) {
      const active = name === protocol.toLowerCase();
      getElement(name).classList.toggle('active', active);
      getElement(name).setAttribute('aria-pressed', String(active));
    }
    getElement('profileDescription').textContent =
      protocol === 'TCP'
        ? 'IPv4 · NAT/PAT · TCP · TLS 1.3 · end-to-end encryption'
        : 'IPv4 · NAT/PAT · UDP · TURN ChannelData · DTLS-SRTP';
    showPanel('list');
    renderNatTable(sim);
    renderHopPanel(selectedNode, sim);
    render(true);
  }
  function render(force = false) {
    getElement('clock').textContent = `${sim.time.toFixed(1)} s`;
    getElement<HTMLButtonElement>('send').disabled = sim.running;
    getElement<HTMLButtonElement>('pause').disabled = !sim.running;
    getElement<HTMLButtonElement>('step').disabled = sim.complete;
    getElement<HTMLButtonElement>('stepBack').disabled = sim.time <= 0;
    getElement<HTMLButtonElement>('pause').textContent = sim.paused ? 'Resume' : 'Pause';
    getElement('sceneState').textContent = sim.complete
      ? 'COMPLETE'
      : sim.paused
        ? 'PAUSED'
        : sim.running
          ? phases[sim.phase].toUpperCase()
          : 'READY';
    getElement('packetCount').textContent = String(sim.packets.length);
    getElement('delivered').textContent = `${sim.delivered}/4`;
    getElement('stageTitle').textContent = sim.title;
    getElement('stageText').textContent = sim.description;
    getElement('stageLabel').textContent = phases[sim.phase].toUpperCase();
    getElement('phases').innerHTML = phases
      .slice(1, -1)
      .map(
        (phaseName, phaseIndex) =>
          `<span class="${sim.phase === phaseIndex + 1 ? 'current' : sim.phase > phaseIndex + 1 ? 'done' : ''}">${sim.phase > phaseIndex + 1 ? '✓' : String(phaseIndex + 1).padStart(2, '0')} ${phaseName}</span>`,
      )
      .join('');
    const selectedPacket = sim.packets.find((packet) => packet.id === selectedId);
    getElement('packetEmpty').hidden = !!selectedPacket;
    getElement('packetDetails').hidden = !selectedPacket;
    if (activePanel === 'packet' && selectedPacket && (force || sim.revision !== lastRevision))
      renderPacketInspector(selectedPacket, sim, snapshotIndex, scene.followId);
    if (force || sim.revision !== lastRevision) {
      if (activePanel === 'list') renderPacketRows(sim, selectedId);
      renderReceiverBuffer(sim);
      lastRevision = sim.revision;
    }
    getElement('concurrencyNote').textContent =
      sim.packets.some((packet) => packet.id === 'P011' && packet.status === 'in flight') &&
      sim.packets.some((packet) => packet.id === 'P012' && packet.status === 'in flight') &&
      sim.protocol === 'TCP'
        ? 'P011 acknowledges ServerHello toward the relay. P012 carries the encrypted TLS server flight toward the client. Opposite directions can be active together. Exact launch timing here is illustrative.'
        : '';
  }
  getElement<HTMLButtonElement>('send').onclick = () => {
    if (sim.complete) reset();
    sim.start();
    render(true);
  };
  getElement<HTMLButtonElement>('pause').onclick = () => {
    sim.paused = !sim.paused;
    render(true);
  };
  getElement<HTMLButtonElement>('step').onclick = () => stepTimeline(1);
  getElement<HTMLButtonElement>('stepBack').onclick = () => stepTimeline(-1);
  getElement('reset').onclick = () => reset();
  getElement('tcp').onclick = () => reset('TCP');
  getElement('udp').onclick = () => reset('UDP');
  getElement<HTMLSelectElement>('sender').onchange = () => reset();
  getElement('listTab').onclick = () => showPanel('list');
  getElement('packetTab').onclick = () => {
    showPanel('packet');
    render(true);
  };
  getElement('hopTab').onclick = () => {
    showPanel('hop');
    renderHopPanel(selectedNode, sim);
  };
  getElement('steps').onclick = (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-node]');
    if (b?.dataset.node) selectNode(+b.dataset.node);
  };
  getElement('packetRows').onclick = (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-packet]');
    if (b?.dataset.packet) selectPacket(b.dataset.packet);
  };
  getElement('packetHops').onclick = (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-snapshot]');
    if (!b) return;
    snapshotIndex = b.dataset.snapshot === 'current' ? null : +(b.dataset.snapshot ?? 0);
    render(true);
  };
  getElement<HTMLButtonElement>('follow').onclick = () => {
    scene.followId = scene.followId === selectedId ? null : selectedId;
    if (scene.followId) sim.paused = false;
    render(true);
  };
  getElement<HTMLSelectElement>('packetFilter').onchange = () => renderPacketRows(sim, selectedId);
  getElement('devices').onclick = (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-device]');
    if (b) {
      getElement<HTMLSelectElement>('sender').value = b.dataset.device ?? '0';
      reset();
    }
  };
  function setView(view: SceneView) {
    scene.setView(view);
    scene.onCamera?.();
  }
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((viewButton) => {
    viewButton.onclick = () => setView(viewButton.dataset.view as SceneView);
  });
  getElement<HTMLInputElement>('zoom').oninput = () =>
    scene.setZoom(+getElement<HTMLInputElement>('zoom').value / 100);
  getElement('zoomIn').onclick = () => scene.setZoom(scene.zoom * 1.25);
  getElement('zoomOut').onclick = () => scene.setZoom(scene.zoom / 1.25);
  getElement('fit').onclick = () => {
    scene.fit();
    getElement<HTMLSelectElement>('focus').value = 'all';
  };
  getElement<HTMLSelectElement>('focus').onchange = () =>
    scene.focus(getElement<HTMLSelectElement>('focus').value);
  getElement('openLan').onclick = () => {
    setView('lan');
    getElement('natLab').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  getElement('showLan').onclick = () => {
    setView('lan');
    getElement<HTMLCanvasElement>('globe').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  getElement('guideButton').onclick = () =>
    getElement('guide').scrollIntoView({ behavior: 'smooth' });
  getElement('assumptionsButton').onclick = () => {
    const details = getElement('assumptions').querySelector('details');
    if (details) details.open = true;
    getElement('assumptions').scrollIntoView({ behavior: 'smooth' });
  };
  const conceptMarkup = CONCEPTS.map(
    ([name, title, diagram, text]) =>
      `<div class="eyebrow">${name.toUpperCase()}</div><h2>${title}</h2><div class="concept-diagram">${diagram.map((s, i) => `<div><span>${String(i + 1).padStart(2, '0')}</span><b>${escapeHtml(s)}</b></div>`).join('')}</div><p>${text}</p>`,
  );
  let activeConcept = -1;
  function concept(index: number) {
    if (index === activeConcept) return;
    activeConcept = index;
    conceptButtons.forEach((b, i) => {
      const active = i === index;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    getElement('conceptContent').innerHTML = conceptMarkup[index] + ConceptVisuals.render(index);
  }
  getElement('conceptNav').innerHTML = CONCEPTS.map(
    (c, i) => `<button data-concept="${i}" aria-pressed="false">${c[0]}</button>`,
  ).join('');
  const conceptButtons = [...document.querySelectorAll('[data-concept]')];
  getElement('conceptNav').onclick = (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-concept]');
    if (b?.dataset.concept) concept(+b.dataset.concept);
  };
  getElement('boundaries').innerHTML = MODEL_BOUNDARIES_HTML;

  let last = performance.now(),
    sceneVisible = true,
    previousUIKey = '',
    lastSceneDraw = 0,
    lastClockDraw = 0;
  let disposed = false,
    frameId: number;
  function frame(now: number) {
    if (disposed) return;
    const elapsed = Math.min((now - last) / 1000, 0.5);
    last = now;
    if (!document.hidden) {
      timeline.advance(elapsed * Number(getElement<HTMLSelectElement>('speed').value));
      const sceneKey = [
        scene.view,
        scene.zoom,
        scene.yaw,
        scene.pitch,
        scene.pan.x,
        scene.pan.y,
        scene.w,
        scene.h,
        sim.time,
        sim.revision,
        sim.device.ip,
        selectedId,
        selectedNode,
      ].join('|');
      if (sceneVisible && now - lastSceneDraw >= 33 && sceneKey !== previousSceneKey) {
        scene.draw();
        previousSceneKey = sceneKey;
        lastSceneDraw = now;
      }
      if (now - lastClockDraw >= 100) {
        getElement('clock').textContent = `${sim.time.toFixed(1)} s`;
        lastClockDraw = now;
      }
      const uiKey = [
        sim.revision,
        sim.running,
        sim.paused,
        sim.complete,
        sim.phase,
        activePanel,
        selectedId,
        snapshotIndex,
      ].join('|');
      if (now - lastRender > 100 && uiKey !== previousUIKey) {
        render();
        lastRender = now;
        previousUIKey = uiKey;
      }
    }
    frameId = requestAnimationFrame(frame);
  }
  let observer: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        sceneVisible = entries[0].isIntersecting;
        if (sceneVisible) previousSceneKey = '';
      },
      { rootMargin: '80px' },
    );
    observer.observe(getElement<HTMLCanvasElement>('globe'));
  }
  const onVisibilityChange = () => {
    last = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  // Standard tab keyboard navigation keeps the top inspection workspace accessible.
  const inspectionTabs = ['list', 'packet', 'hop'];
  for (const name of inspectionTabs)
    getElement(`${name}Tab`).addEventListener('keydown', (event) => {
      let index = inspectionTabs.indexOf(name);
      if (event.key === 'ArrowRight') index = (index + 1) % 3;
      else if (event.key === 'ArrowLeft') index = (index + 2) % 3;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = 2;
      else return;
      event.preventDefault();
      getElement(`${inspectionTabs[index]}Tab`).click();
      getElement(`${inspectionTabs[index]}Tab`).focus();
    });
  renderNatTable(sim);
  renderHopPanel(selectedNode, sim);
  concept(0);
  showPanel('list');
  render(true);
  frameId = requestAnimationFrame(frame);
  return () => {
    disposed = true;
    cancelAnimationFrame(frameId);
    observer?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    scene.destroy();
  };
}
