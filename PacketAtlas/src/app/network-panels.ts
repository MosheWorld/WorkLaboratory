import { DEVICES, NODES } from '../simulation/network-data';
import type { Simulation } from '../simulation/Simulation';
import { getElement, renderDefinitionList } from './dom';

export function renderHopPanel(selectedNode: number, sim: Simulation) {
  const selectedNodeData = NODES[selectedNode];
  getElement('steps').innerHTML = NODES.map(
    (node, nodeIndex) =>
      `<button class="step ${nodeIndex === selectedNode ? 'selected' : ''}" data-node="${nodeIndex}"><span>${String(nodeIndex + 1).padStart(2, '0')}</span>${node.name}</button>`,
  ).join('');
  getElement('nodeTitle').textContent = selectedNodeData.name;
  getElement('nodeText').textContent =
    selectedNode === 9 && sim.protocol === 'UDP'
      ? 'The OS delivers UDP datagrams to the recipient socket. TURN framing is removed, then SRTP authentication and replay checks protect the media. Valid media is decrypted with the peer-derived SRTP keys. UDP itself does not acknowledge or order frames.'
      : selectedNodeData.text;
  getElement('nodeInfo').innerHTML = renderDefinitionList([
    ['Location', selectedNode === 6 ? 'US West (illustrative)' : selectedNodeData.short],
    [
      'Interface IP',
      selectedNode === 0
        ? sim.device.ip
        : selectedNode === 1
          ? 'LAN 192.168.1.1 / WAN 203.0.113.10'
          : selectedNode === 8
            ? 'LAN 192.168.0.1 / WAN 203.0.113.80'
            : selectedNodeData.ip,
    ],
    ['Role', selectedNodeData.role],
  ]);
  getElement('openLan').hidden = selectedNode > 2;
}

export function renderReceiverBuffer(sim: Simulation) {
  const arrived = sim.arrived[1];
  getElement('buffer').innerHTML = Array.from({ length: 4 }, (_, chunkIndex) => {
    const buffered =
      sim.packets.some(
        (p) =>
          p.kind === 'DATA' &&
          p.leg === 'B' &&
          p.chunk === chunkIndex &&
          p.status === 'received' &&
          p.buffered,
      ) && !arrived[chunkIndex];
    return `<span class="${arrived[chunkIndex] ? 'received' : buffered ? 'buffered' : sim.complete ? 'missing' : ''}">${chunkIndex + 1}</span>`;
  }).join('');
  getElement('bufferText').textContent = sim.complete
    ? sim.delivered === 4
      ? 'All four payloads are available to the recipient.'
      : `${4 - sim.delivered} missing media frame(s); playback has gaps.`
    : sim.protocol === 'TCP'
      ? 'Recipient: purple bytes are buffered; green bytes are contiguous and available.'
      : 'Recipient: received SRTP frames are available without waiting for missing datagrams.';
}
export function renderNatTable(sim: Simulation) {
  const protocol = sim.protocol,
    remote = protocol === 'TCP' ? 443 : 3478;
  getElement('devices').innerHTML = DEVICES.map(
    (d, i) =>
      `<button data-device="${i}" class="device ${d.ip === sim.device.ip ? 'selected' : ''}"><span>${i === 0 ? '▯' : i === 1 ? '▱' : '▣'}</span><b>${d.name}</b><small>${d.ip}:${d.port}</small></button>`,
  ).join('');
  getElement('natRows').innerHTML = DEVICES.map(
    (d) =>
      `<tr class="${d.ip === sim.device.ip ? 'selected' : ''}"><td>${d.name}<small>${protocol}</small></td><td>${d.ip}:${d.port}</td><td>203.0.113.10:${d.mapped}</td><td>198.51.100.40:${remote}</td></tr>`,
  ).join('');
}
