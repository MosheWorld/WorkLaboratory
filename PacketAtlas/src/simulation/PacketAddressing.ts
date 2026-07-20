import type { Packet, PacketSnapshot } from './types';
import type { Simulation } from './Simulation';

/** Header snapshots represent the outgoing side of a forwarding node. */
export const PacketAddressing = Object.freeze({
  snapshot(packet: Packet, hop: number, simulation: Simulation): PacketSnapshot {
    const node = packet.route[hop],
      device = simulation.device;
    const local = packet.kind === 'ARP' || packet.kind === 'DNS';
    const outbound = packet.from === 0;
    let source: string,
      destination: string,
      sourcePort: number | null,
      destinationPort: number | null;
    if (local) {
      source = outbound ? device.ip : '192.168.1.1';
      destination = outbound ? '192.168.1.1' : device.ip;
      sourcePort = packet.kind === 'ARP' ? null : outbound ? 54000 : 53;
      destinationPort = packet.kind === 'ARP' ? null : outbound ? 53 : 54000;
    } else {
      const serverPort = simulation.protocol === 'TCP' ? 443 : 3478;
      const senderLeg = packet.from === 0 || packet.to === 0;
      const clientPrivate = senderLeg ? device.ip : '192.168.0.30';
      const clientPublic = senderLeg ? '203.0.113.10' : '203.0.113.80';
      const privatePort = senderLeg ? device.port : 51821;
      const mappedPort = senderLeg ? device.mapped : 63002;
      const fromClient = packet.from !== 6;
      const onLan = fromClient ? hop === 0 : senderLeg ? node <= 1 : node >= 8;
      const clientAddress = onLan ? clientPrivate : clientPublic,
        clientPort = onLan ? privatePort : mappedPort;
      source = fromClient ? clientAddress : '198.51.100.40';
      sourcePort = fromClient ? clientPort : serverPort;
      destination = fromClient ? '198.51.100.40' : clientAddress;
      destinationPort = fromClient ? serverPort : clientPort;
    }
    let macSrc = 'Abstracted link address',
      macDst = 'Abstracted link address';
    if (local || node === 0 || (node === 1 && packet.to === 0)) {
      macSrc = outbound ? device.mac : '02:00:00:00:01:01';
      macDst = outbound ? '02:00:00:00:01:01' : device.mac;
    } else if (node === 9 || (node === 8 && packet.to === 9)) {
      macSrc = packet.from === 9 ? '02:00:00:00:00:30' : '02:00:00:00:00:01';
      macDst = packet.from === 9 ? '02:00:00:00:00:01' : '02:00:00:00:00:30';
    }
    if (packet.kind === 'ARP' && outbound) macDst = 'ff:ff:ff:ff:ff:ff';
    return {
      node,
      hop,
      time: simulation.time,
      src: source,
      dst: destination,
      sport: sourcePort,
      dport: destinationPort,
      ttl: packet.kind === 'ARP' ? null : 64 - Math.min(hop, packet.route.length - 2),
      macSrc,
      macDst,
    };
  },
});
