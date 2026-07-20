import { NODES } from './network-data';
import type { Packet, PacketSnapshot } from './types';
import type { Simulation } from './Simulation';

const PACKET_PURPOSES: Readonly<Record<string, string>> = Object.freeze({
  SYN: 'The client asks the relay to open a TCP connection and announces its initial sequence number.',
  'SYN-ACK':
    'The relay acknowledges the client SYN and announces its own initial sequence number. The client must acknowledge this reply.',
  'Handshake ACK':
    'The client acknowledges the relay SYN. This completes the modeled three-way handshake so TLS can begin.',
  ACK: 'The receiver reports the next TCP byte it expects. This confirms receipt of bytes, not certificate verification, message decryption or reading.',
  'TLS ClientHello':
    'The client proposes TLS versions and cipher suites and sends an ephemeral key share. The server name is visible because this example does not use ECH.',
  'TLS ServerHello':
    'The relay selects TLS 1.3 parameters and returns its ephemeral key share. The two endpoints can then derive keys for the encrypted handshake.',
  'TLS encrypted server flight':
    'The relay sends encrypted handshake records containing its certificate, CertificateVerify signature and Finished authenticator. The client must check the certificate chain, server name, signature and transcript before trusting the relay.',
  'TLS client Finished':
    'The client sends an encrypted Finished authenticator for the handshake transcript. The relay checks it before this example proceeds to application data.',
  'DTLS ClientHello':
    'The initiating device proposes DTLS parameters and SRTP protection profiles. TURN carries this handshake toward the other device.',
  'DTLS server handshake flight':
    'The other device returns a representative DTLS server flight. The initiator checks the peer certificate fingerprint against trusted signaling and verifies the handshake.',
  'DTLS client Finished':
    'The initiator sends a representative DTLS Finished flight. Successful peer authentication and transcript checks allow the devices to derive SRTP media keys.',
});

export const PacketNarrator = Object.freeze({
  describe(packet: Packet, snapshot: PacketSnapshot, simulation: Simulation) {
    const historical = snapshot !== packet.snapshots.at(-1);
    const deviceName = (index: number) =>
      index === 0 ? simulation.device.name : NODES[index].name;
    const location = historical
      ? `Recorded at ${deviceName(snapshot.node)} at ${snapshot.time.toFixed(2)} s.`
      : packet.status === 'in flight'
        ? `${deviceName(packet.from)} → ${deviceName(packet.to)}. Currently at or after ${deviceName(snapshot.node)}.`
        : packet.status === 'lost'
          ? `Lost after ${deviceName(packet.route[packet.hop])}.`
          : `Received by ${deviceName(packet.to)}.`;
    const status = historical
      ? 'This is an earlier header snapshot; the badge above describes the current transmission.'
      : this.state(packet, simulation);
    const concurrent =
      simulation.protocol === 'TCP' && ['P011', 'P012'].includes(packet.id)
        ? 'P011 and P012 can be in flight together: TCP sends and receives in parallel. Their exact start times are illustrative.'
        : '';
    return [
      location,
      this.purpose(packet, simulation),
      this.addressExplanation(packet, snapshot),
      status,
      concurrent,
    ]
      .filter(Boolean)
      .join(' ');
  },
  purpose(packet: Packet, simulation: Simulation) {
    if (packet.kind === 'ARP')
      return packet.from === 0
        ? 'The device broadcasts on its local LAN to discover the MAC address of gateway 192.168.1.1. ARP has no IP header or transport ports.'
        : 'The gateway returns its LAN MAC address. The device can cache that address and send local frames to the gateway. This reply stays inside the LAN.';
    if (packet.kind === 'DNS')
      return packet.from === 0
        ? 'The device asks its gateway resolver for the IPv4 address of relay.example using UDP port 53.'
        : 'The gateway resolver returns the illustrative address 198.51.100.40. Upstream DNS resolution is omitted; this answer alone does not authenticate the server.';
    if (packet.kind === 'DATA') {
      if (simulation.protocol === 'TCP')
        return packet.leg === 'A'
          ? 'A TCP segment carries TLS A records containing end-to-end message ciphertext to the relay. The relay can remove TLS A but cannot decrypt the inner message.'
          : 'The relay sends the same end-to-end message ciphertext on independent connection B, protected with TLS B keys and connection B sequence numbers.';
      return packet.leg === 'A'
        ? 'A TURN ChannelData message carries an SRTP-protected voice frame to the relay. The RTP sequence identifies a media frame, not a UDP sequence number.'
        : 'The relay forwards the SRTP-protected voice frame inside ChannelData for the recipient allocation. It does not decrypt the media, and UDP does not acknowledge or retransmit it.';
    }
    return PACKET_PURPOSES[packet.label] || packet.security;
  },
  addressExplanation(packet: Packet, snapshot: PacketSnapshot) {
    if (packet.kind === 'ARP')
      return 'The address fields here are ARP sender and target protocol addresses.';
    if (packet.kind === 'DNS')
      return 'The gateway uses LAN address 192.168.1.1 here; its public WAN address is a separate interface. No NAT occurs on this DNS hop.';
    if (snapshot.node === 1 || snapshot.node === 8)
      return 'The displayed source and destination are the headers after the gateway has translated the address and port for the next link.';
    if (snapshot.node !== packet.from && snapshot.node !== packet.to)
      return 'This router forwards toward the packet destination. Its own interface IP does not replace the destination IP.';
    return '';
  },
  state(packet: Packet, simulation: Simulation) {
    if (packet.status === 'lost')
      return packet.kind === 'DATA' && simulation.protocol === 'UDP'
        ? 'The missing media frame leaves a gap.'
        : 'Protocol recovery may create another transmission.';
    if (packet.acknowledged)
      return 'A cumulative TCP acknowledgment covering these bytes has reached the sender.';
    if (packet.buffered) return 'These bytes are buffered until earlier missing bytes arrive.';
    return packet.attempt > 1 ? `Transmission attempt ${packet.attempt}.` : '';
  },
});
