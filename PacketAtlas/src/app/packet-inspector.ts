import { NODES } from '../simulation/network-data';
import { PacketNarrator } from '../simulation/PacketNarrator';
import type { Simulation } from '../simulation/Simulation';
import type { Packet, PacketSnapshot } from '../simulation/types';
import { escapeHtml, getElement, renderDefinitionList } from './dom';

type PacketLayer = [title: string, content: string];

function packetStatus(packet: Packet) {
  if (packet.status === 'lost') return packet.acknowledged ? 'Lost attempt; bytes ACKed' : 'lost';
  if (packet.status === 'in flight') return 'In flight';
  if (packet.acknowledged) return 'Acknowledged';
  return packet.buffered ? 'Buffered' : 'Received';
}

function isTcpPacket(packet: Packet, simulation: Simulation) {
  return (
    packet.kind === 'TCP' ||
    packet.kind === 'TLS' ||
    (packet.kind === 'DATA' && simulation.protocol === 'TCP')
  );
}

function wireInfo(packet: Packet, isTcp: boolean, isArp: boolean) {
  const turnHeaderBytes = packet.turnChannel ? 4 : 0;
  const transportPayload = packet.bytes + turnHeaderBytes;
  return {
    turnHeaderBytes,
    transportPayload,
    ipLength: isArp ? null : 20 + (isTcp ? 20 : 8) + transportPayload,
  };
}

function transportName(packet: Packet, isTcp: boolean, isArp: boolean) {
  if (isArp) return 'No IP transport';
  return packet.kind === 'DNS' ? 'UDP' : isTcp ? 'TCP' : 'UDP';
}

function packetConnectionLabel(packet: Packet, simulation: Simulation) {
  if (packet.connection === 'LAN') return `LOCAL ${packet.connection}`;
  return `${simulation.protocol === 'UDP' ? 'PATH LEG' : 'CONNECTION'} ${packet.connection}`;
}

function buildPacketFields(
  packet: Packet,
  snapshot: PacketSnapshot,
  transport: string,
  wireSize: ReturnType<typeof wireInfo>,
  isTcp: boolean,
  isArp: boolean,
) {
  const location = NODES[snapshot.node].name;
  const observationPoint =
    isArp || packet.kind === 'DNS'
      ? 'Local LAN; no NAT'
      : snapshot.node === 1 || snapshot.node === 8
        ? 'After gateway translation / forwarding'
        : 'Host or outgoing routed link';
  const fields: Array<[string, unknown]> = [
    ['Snapshot hop', location],
    ['Observation point', observationPoint],
    [
      isArp ? 'ARP sender IP' : 'Source IP : port',
      isArp ? snapshot.src : `${snapshot.src}:${snapshot.sport}`,
    ],
    [
      isArp ? 'ARP target IP' : 'Destination IP : port',
      isArp ? snapshot.dst : `${snapshot.dst}:${snapshot.dport}`,
    ],
    ['Transport', transport],
    ['TTL', isArp ? 'Not present in ARP' : snapshot.ttl],
    ['Modeled IP length', isArp ? 'Not an IP packet' : `${wireSize.ipLength} bytes`],
    ['Modeled inner content', `${packet.bytes} bytes`],
    [
      'Header model',
      isArp
        ? 'Ethernet + ARP'
        : isTcp
          ? 'IPv4 20 + TCP 20 bytes'
          : `IPv4 20 + UDP 8${wireSize.turnHeaderBytes ? ' + TURN ChannelData 4' : ''} bytes`,
    ],
    [
      'Sequence',
      isArp
        ? 'Not present in ARP'
        : isTcp
          ? (packet.seq ?? 'N/A')
          : packet.rtpSeq !== undefined
            ? `RTP ${packet.rtpSeq}`
            : 'No UDP sequence field',
    ],
    ['ACK', isArp ? 'Not present in ARP' : isTcp ? (packet.ack ?? 'Not set') : 'No UDP ACK field'],
    ['Flags', packet.flags || 'N/A'],
    ['Transmission', `${packet.attempt}${packet.attempt > 1 ? ' (retry)' : ' (original)'}`],
  ];
  if (packet.kind === 'DATA' && packet.leg === 'B')
    fields.push([
      'Related payload',
      `Same application chunk #${(packet.chunk ?? 0) + 1}, new IP packet`,
    ]);
  return fields;
}

function payloadLayerTitle(packet: Packet, simulation: Simulation) {
  if (packet.kind === 'TLS') return 'TLS 1.3 record(s)';
  if (packet.kind === 'DTLS') return 'DTLS handshake';
  if (packet.kind === 'DATA')
    return simulation.protocol === 'TCP' ? 'TLS + inner E2EE' : 'SRTP media protection';
  return 'Control payload';
}

function buildPacketLayers(
  packet: Packet,
  snapshot: PacketSnapshot,
  simulation: Simulation,
  transport: string,
  wireSize: ReturnType<typeof wireInfo>,
  isTcp: boolean,
  isArp: boolean,
): PacketLayer[] {
  if (isArp)
    return [
      [
        'Ethernet / ARP',
        `Source MAC ${snapshot.macSrc}. Destination MAC ${snapshot.macDst}. ARP EtherType 0x0806; no TCP, UDP or IP header.`,
      ],
    ];
  const layers: PacketLayer[] = [
    [
      'Link layer',
      snapshot.macSrc !== 'Abstracted link address'
        ? `Modeled local Ethernet addresses ${snapshot.macSrc} → ${snapshot.macDst}. MAC addresses are not carried end-to-end across routers.`
        : 'Link-layer addresses are abstracted here because backbone framing is link specific and may not be Ethernet.',
    ],
    [
      'IPv4 header',
      `Visible ${snapshot.src} → ${snapshot.dst}. TTL ${snapshot.ttl}; protocol ${isTcp ? '6 (TCP)' : '17 (UDP)'}. A router updates TTL and header checksum. NAT also changes addresses and transport checksum.`,
    ],
    [
      `${transport} header`,
      isTcp
        ? `Visible ports ${snapshot.sport} → ${snapshot.dport}; ${packet.flags || 'ACK'}; byte sequence ${packet.seq ?? 'N/A'}, acknowledgment ${packet.ack ?? 'not set'}. This animation unit is a modeled TCP segment; TLS record boundaries do not generally align with TCP segments.`
        : `Visible ports ${snapshot.sport} → ${snapshot.dport}; modeled UDP length ${wireSize.transportPayload + 8} bytes. UDP has no sequence or acknowledgment number.`,
    ],
  ];
  if (wireSize.turnHeaderBytes)
    layers.push([
      'TURN ChannelData',
      `Channel number 0x${(packet.channel ?? 0).toString(16)}; 4-byte header followed by ${packet.bytes} bytes of inner data. The relay uses the allocation and channel binding to forward it.`,
    ]);
  layers.push([payloadLayerTitle(packet, simulation), packet.security]);
  return layers;
}

function renderLayers(layers: PacketLayer[]) {
  return layers
    .map(
      ([title, content], index) =>
        `<details class="layer layer-${index}" ${index === layers.length - 1 ? 'open' : ''}><summary>${title}</summary><p>${escapeHtml(content)}</p></details>`,
    )
    .join('');
}

function renderPacketHops(packet: Packet, snapshotIndex: number | null) {
  const current = `<button class="hop-state ${snapshotIndex === null ? 'active' : ''}" data-snapshot="current">Current state</button>`;
  return (
    current +
    packet.route
      .map((nodeIndex, hopIndex) => {
        const snapshot = packet.snapshots[hopIndex];
        const reached = snapshot !== undefined;
        const state = snapshot?.ttl === null ? 'ARP' : `TTL ${snapshot?.ttl}`;
        return `<button class="hop-state ${snapshotIndex === hopIndex ? 'active' : ''} ${reached ? 'reached' : ''}" data-snapshot="${hopIndex}" ${reached ? '' : 'disabled'}><span>${reached ? '✓' : '○'}</span>${NODES[nodeIndex].name}<small>${reached ? state : 'Not reached'}</small></button>`;
      })
      .join('')
  );
}

function renderPacketHistory(packet: Packet) {
  return packet.history
    .slice(-16)
    .map(
      (entry) =>
        `<div class="history-event"><time>${entry.time.toFixed(1)}s</time><span>${escapeHtml(entry.text)}</span></div>`,
    )
    .join('');
}

export function renderPacketInspector(
  packet: Packet,
  simulation: Simulation,
  snapshotIndex: number | null,
  followId: string | null,
) {
  const snapshot =
    snapshotIndex === null ? packet.snapshots.at(-1) : packet.snapshots[snapshotIndex];
  if (!snapshot) return;
  const isArp = packet.kind === 'ARP';
  const isTcp = isTcpPacket(packet, simulation);
  const transport = transportName(packet, isTcp, isArp);
  const wireSize = wireInfo(packet, isTcp, isArp);
  const location = NODES[snapshot.node].name;
  getElement('packetId').textContent =
    `${packet.id} / ${packetConnectionLabel(packet, simulation)}`;
  getElement('packetTitle').textContent = packet.label;
  getElement('packetState').textContent = packetStatus(packet);
  getElement('packetSummary').textContent = PacketNarrator.describe(packet, snapshot, simulation);
  getElement<HTMLButtonElement>('follow').disabled = packet.status !== 'in flight';
  getElement<HTMLButtonElement>('follow').textContent =
    followId === packet.id ? 'Following' : 'Follow packet';
  getElement('snapshotNotice').textContent =
    snapshotIndex === null
      ? `Live packet state · ${location}`
      : `Historical snapshot · ${location} · ${snapshot.time.toFixed(1)}s (click Current to return)`;
  getElement('packetFields').innerHTML = renderDefinitionList(
    buildPacketFields(packet, snapshot, transport, wireSize, isTcp, isArp),
  );
  getElement('layers').innerHTML = renderLayers(
    buildPacketLayers(packet, snapshot, simulation, transport, wireSize, isTcp, isArp),
  );
  getElement('packetHops').innerHTML = renderPacketHops(packet, snapshotIndex);
  getElement('packetHistory').innerHTML = renderPacketHistory(packet);
}

function shouldIncludePacket(packet: Packet, filter: string) {
  return (
    filter === 'all' ||
    (filter === 'live' && packet.status === 'in flight') ||
    (filter === 'data' && packet.kind === 'DATA') ||
    (filter === 'security' && ['TLS', 'DTLS'].includes(packet.kind)) ||
    (filter === 'lost' && (packet.status === 'lost' || packet.attempt > 1))
  );
}

function renderPacketRow(packet: Packet, simulation: Simulation, selectedId: string | null) {
  const isTcp = isTcpPacket(packet, simulation);
  const wireSize = wireInfo(packet, isTcp, packet.kind === 'ARP');
  const connection =
    packet.connection === 'LAN'
      ? 'Local'
      : packet.connection === 'A'
        ? 'A · sender / relay'
        : 'B · recipient / relay';
  return `<tr class="${packet.id === selectedId ? 'selected' : ''}"><td><button data-packet="${packet.id}" aria-label="Inspect ${packet.id} ${escapeHtml(packet.label)}">${packet.id} ↗</button></td><td>${escapeHtml(packet.label)}</td><td>${connection}</td><td><span class="status-${packet.status.replace(' ', '-')}">${packetStatus(packet)}</span> · ${NODES[packet.route[packet.hop]].name}</td><td>${packet.seq ?? packet.rtpSeq ?? 'N/A'}</td><td>${packet.kind === 'ARP' ? 'ARP' : wireSize.ipLength}</td></tr>`;
}

export function renderPacketRows(simulation: Simulation, selectedId: string | null) {
  const filter = getElement<HTMLSelectElement>('packetFilter').value;
  const rows = simulation.packets
    .filter((packet) => shouldIncludePacket(packet, filter))
    .map((packet) => renderPacketRow(packet, simulation, selectedId))
    .join('');
  getElement('packetRows').innerHTML =
    rows || '<tr><td colspan="6">No packets in this view.</td></tr>';
}
