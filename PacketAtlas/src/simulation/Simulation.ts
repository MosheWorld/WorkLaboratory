import { PacketAddressing } from './PacketAddressing';
import { DEVICES, NODES } from './network-data';
import type {
  Device,
  MediaFlight,
  Packet,
  PacketSpec,
  Protocol,
  ScheduledJob,
  TcpConnection,
  TcpDescriptor,
} from './types';

export class Simulation {
  protocol: Protocol;
  device: Device;
  time = 0;
  packets: Packet[] = [];
  jobs: ScheduledJob[] = [];
  phase = 0;
  running = false;
  paused = false;
  complete = false;
  lost = 0;
  retries = 0;
  dropRule: { chunk: number; leg: 'A' | 'B'; node: number } | null = null;
  events: Array<{ time: number; text: string }> = [];
  arrived: boolean[][] = [[], []];
  forwarded = new Set<number>();
  connections: Record<string, TcpConnection> = {};
  title = '';
  description = '';
  revision = 0;

  constructor(protocol: Protocol = 'TCP', device = 0) {
    this.protocol = protocol;
    this.device = DEVICES[device];
    this.reset();
  }
  reset() {
    this.time = 0;
    this.packets = [];
    this.jobs = [];
    this.phase = 0;
    this.running = false;
    this.paused = false;
    this.complete = false;
    this.lost = 0;
    this.retries = 0;
    this.dropRule = null;
    this.events = [];
    this.arrived = [[], []];
    this.forwarded = new Set();
    this.connections = {};
    this.title = 'A secure conversation starts before the message.';
    this.description = 'Follow ARP, DNS, transport setup, security and encrypted payloads.';
    this.revision = 0;
  }
  event(text: string) {
    this.events.push({ time: this.time, text });
    this.revision++;
  }
  stage(phase: number, title: string, description: string) {
    this.phase = phase;
    this.title = title;
    this.description = description;
    this.event(title);
  }
  schedule(delay: number, fn: () => void, valid = () => true) {
    this.jobs.push({ at: this.time + delay, fn, valid });
  }
  route(from: number, to: number) {
    const path = [];
    for (let node = from; ; node += to > from ? 1 : -1) {
      path.push(node);
      if (node === to) break;
    }
    return path;
  }
  launch(spec: PacketSpec, arrive?: (packet: Packet) => void) {
    const packet: Packet = {
      ...spec,
      id: `P${String(this.packets.length + 1).padStart(3, '0')}`,
      start: this.time,
      status: 'in flight',
      history: [],
      snapshots: [],
      route: spec.route || this.route(spec.from, spec.to),
      attempt: spec.attempt || 1,
      root: spec.root || 'pending',
      duration: 0,
      arrive,
      hop: 0,
    };
    packet.duration = (packet.route.length - 1) * 0.65 + 0.5;
    packet.history.push({
      time: this.time,
      text: `Sent from ${NODES[packet.from].name}${packet.attempt > 1 ? ' (retransmission)' : ''}.`,
    });
    packet.snapshots.push(this.snapshot(packet, 0));
    packet.root = spec.root || packet.id;
    this.packets.push(packet);
    this.revision++;
    return packet;
  }
  snapshot(p: Packet, hop: number) {
    return PacketAddressing.snapshot(p, hop, this);
  }

  drop(p: Packet | undefined) {
    if (p?.status !== 'in flight') return false;
    p.status = 'lost';
    p.history.push({
      time: this.time,
      text: `Dropped after ${NODES[p.route[p.hop]].name}. No acknowledgment is generated for this arrival.`,
    });
    p.lossTime = this.time;
    this.lost++;
    this.event(`${p.id} lost: ${p.label}`);
    return true;
  }
  retryControl(spec: PacketSpec, arrive: (packet: Packet) => void, onAckLoss?: () => void) {
    let p: Packet;
    const attempt = (count = 1) => {
      p = this.launch({ ...spec, attempt: count }, () => arrive(p));
      this.schedule(
        p.duration + 2,
        () => {
          if (p.status === 'lost') {
            this.retries++;
            if (onAckLoss) onAckLoss();
            else attempt(count + 1);
          }
        },
        () => p.status === 'lost' || p.status === 'in flight',
      );
    };
    attempt();
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.stage(
      1,
      'Find the local next hop.',
      'ARP resolves the gateway’s MAC address. Your device sends remote-IP traffic to that local gateway.',
    );
    this.retryControl(
      {
        from: 0,
        to: 1,
        kind: 'ARP',
        label: 'ARP: who has 192.168.1.1?',
        connection: 'LAN',
        bytes: 28,
        security: 'Local broadcast; no encryption in ARP itself.',
      },
      () =>
        this.retryControl(
          {
            from: 1,
            to: 0,
            kind: 'ARP',
            label: 'ARP reply: gateway MAC',
            connection: 'LAN',
            bytes: 28,
            security: 'ARP is unauthenticated; a trusted LAN is assumed.',
          },
          () => this.dns(),
        ),
    );
  }
  dns() {
    this.stage(
      2,
      'Resolve a name to an address.',
      'This selected path uses a gateway-proxied DNS lookup over UDP/53. Many current clients instead use encrypted DNS such as DoH or DoT. DNS finds the relay IP, not the recipient’s private phone IP.',
    );
    this.retryControl(
      {
        from: 0,
        to: 1,
        kind: 'DNS',
        label: 'DNS query: relay.example',
        connection: 'LAN',
        bytes: 58,
        security:
          'Gateway-proxied DNS over UDP/53 is the selected example; DoH and DoT are alternatives.',
      },
      () =>
        this.retryControl(
          {
            from: 1,
            to: 0,
            kind: 'DNS',
            label: 'DNS answer: 198.51.100.40',
            connection: 'LAN',
            bytes: 74,
            security: 'DNS gives an address, not server authentication.',
          },
          () => {
            if (this.protocol === 'TCP')
              this.connect('A', 0, () => this.connect('B', 9, () => this.beginData()));
            else this.udpSetup();
          },
        ),
    );
  }
  connect(id: 'A' | 'B', client: number, done: () => void) {
    const conn: TcpConnection = {
      id,
      client,
      server: 6,
      nextClient: id === 'A' ? 1000 : 9000,
      nextServer: id === 'A' ? 7000 : 15000,
      rx: {},
      acked: new Set(),
      dataStart: 0,
    };
    this.connections[id] = conn;
    this.stage(
      3,
      `Connection ${id}: a TCP three-way handshake.`,
      `${id === 'A' ? 'Sender' : 'Recipient'} initiates an outbound connection to the relay. The gateway’s NAT mapping permits matching return traffic.`,
    );
    const syn: PacketSpec = {
      from: client,
      to: 6,
      kind: 'TCP',
      label: 'SYN',
      connection: id,
      bytes: 0,
      seq: conn.nextClient,
      ack: null,
      flags: 'SYN',
      security: 'TCP headers are visible. No TLS session yet.',
    };
    this.retryControl(syn, () => synAck());
    const synAck = () =>
      this.retryControl(
        {
          from: 6,
          to: client,
          kind: 'TCP',
          label: 'SYN-ACK',
          connection: id,
          bytes: 0,
          seq: conn.nextServer,
          ack: conn.nextClient + 1,
          flags: 'SYN, ACK',
          security: 'The SYN consumes one sequence number.',
        },
        () =>
          this.retryControl(
            {
              from: client,
              to: 6,
              kind: 'TCP',
              label: 'Handshake ACK',
              connection: id,
              bytes: 0,
              seq: conn.nextClient + 1,
              ack: conn.nextServer + 1,
              flags: 'ACK',
              security: 'Acknowledges the server SYN. TCP established.',
            },
            () => {
              conn.nextClient++;
              conn.nextServer++;
              conn.rx[client] = { next: conn.nextClient, pending: new Map() };
              conn.rx[6] = { next: conn.nextServer, pending: new Map() };
              this.tls(conn, done);
            },
            synAck,
          ),
      );
  }
  tcpPayload(
    conn: TcpConnection,
    from: number,
    label: string,
    bytes: number,
    security: string,
    done?: () => void,
    extra: Partial<PacketSpec> = {},
  ) {
    const to = from === 6 ? conn.client : 6,
      key = from === 6 ? 'nextServer' : 'nextClient',
      seq = conn[key];
    conn[key] += bytes;
    const descriptor: TcpDescriptor = {
      acked: false,
      attempt: 0,
      seq,
      bytes,
      from,
      to,
      done,
      extra,
    };
    if (!conn.sent) conn.sent = [];
    conn.sent.push(descriptor);
    this.transmitTcpPayload(conn, descriptor, label, security);
    return descriptor;
  }
  private transmitTcpPayload(
    connection: TcpConnection,
    descriptor: TcpDescriptor,
    label: string,
    security: string,
  ) {
    if (descriptor.acked) return;
    const { from, to, seq, bytes, extra } = descriptor;
    const earlierBytesPending = connection.sent?.some(
      (sent) => sent.from === from && sent.seq < seq && !sent.acked,
    );
    if (descriptor.attempt > 0 && earlierBytesPending) {
      this.schedule(
        0.3,
        () => this.transmitTcpPayload(connection, descriptor, label, security),
        () => !descriptor.acked,
      );
      return;
    }
    descriptor.attempt++;
    if (descriptor.attempt > 1) this.retries++;
    const packet = this.launch(
      {
        from,
        to,
        kind: extra.kind || 'TLS',
        label,
        connection: connection.id,
        bytes,
        security,
        seq,
        ack: connection.rx[to].next,
        flags: 'ACK',
        ...extra,
        attempt: descriptor.attempt,
        root: descriptor.root,
      },
      () => this.receiveTcpPayload(connection, descriptor, packet),
    );
    descriptor.root ||= packet.id;
    const retransmissionTimeout = (Math.abs(from - to) * 0.65 + 0.5) * 2 + 3;
    this.schedule(
      retransmissionTimeout,
      () => this.transmitTcpPayload(connection, descriptor, label, security),
      () => !descriptor.acked,
    );
  }
  private receiveTcpPayload(connection: TcpConnection, descriptor: TcpDescriptor, packet: Packet) {
    const { from, to, seq } = descriptor;
    const receiver = connection.rx[from];
    if (seq >= receiver.next && !receiver.pending.has(seq)) receiver.pending.set(seq, descriptor);
    const ready: TcpDescriptor[] = [];
    while (receiver.pending.has(receiver.next)) {
      const contiguous = receiver.pending.get(receiver.next);
      if (!contiguous) break;
      receiver.pending.delete(receiver.next);
      receiver.next += contiguous.bytes;
      ready.push(contiguous);
    }
    for (const previous of this.packets) {
      if (
        previous.connection === connection.id &&
        previous.from === from &&
        previous.seq !== undefined &&
        previous.seq < receiver.next
      )
        previous.buffered = false;
    }
    packet.buffered = seq >= receiver.next;
    packet.history.push({
      time: this.time,
      text: packet.buffered
        ? 'Buffered: earlier bytes are missing.'
        : 'Contiguous byte range available to the receiver.',
    });
    this.sendTcpAcknowledgment(connection, from, to, receiver.next);
    for (const contiguous of ready) {
      if (contiguous.delivered) continue;
      contiguous.delivered = true;
      contiguous.done?.();
    }
  }
  private sendTcpAcknowledgment(
    connection: TcpConnection,
    originalSender: number,
    receiver: number,
    nextExpectedByte: number,
  ) {
    this.launch(
      {
        from: receiver,
        to: originalSender,
        kind: 'TCP',
        label: 'ACK',
        connection: connection.id,
        bytes: 0,
        seq: connection.rx[receiver].next,
        ack: nextExpectedByte,
        flags: 'ACK',
        security: 'TCP ACK is visible. It does not certify decryption, display or reading.',
      },
      () => this.acknowledgeTcpBytes(connection, originalSender, nextExpectedByte),
    );
  }
  private acknowledgeTcpBytes(
    connection: TcpConnection,
    originalSender: number,
    nextExpectedByte: number,
  ) {
    for (const descriptor of connection.sent || []) {
      if (
        descriptor.from !== originalSender ||
        descriptor.seq + descriptor.bytes > nextExpectedByte
      )
        continue;
      descriptor.acked = true;
      for (const packet of this.packets) {
        if (packet.root !== descriptor.root) continue;
        packet.acknowledged = true;
        packet.history.push({
          time: this.time,
          text: `Cumulative ACK ${nextExpectedByte} received at sender.`,
        });
      }
    }
  }
  tls(connection: TcpConnection, onComplete: () => void) {
    this.stage(
      4,
      `Connection ${connection.id}: authenticate and derive TLS keys.`,
      'TLS 1.3 uses ephemeral key agreement. The client verifies the server certificate, signature and Finished before trusting the connection. Each leg has different keys.',
    );
    const send = (
      from: number,
      label: string,
      bytes: number,
      security: string,
      onDelivered: () => void,
    ) => this.tcpPayload(connection, from, label, bytes, security, onDelivered);
    send(
      connection.client,
      'TLS ClientHello',
      220,
      'Visible: supported versions, cipher suites, key share and relay.example SNI (ECH not used).',
      () =>
        send(
          6,
          'TLS ServerHello',
          100,
          'Visible: selected TLS 1.3 parameters and ephemeral server key share. Handshake keys are derived.',
          () =>
            send(
              6,
              'TLS encrypted server flight',
              900,
              'Encrypted handshake records: EncryptedExtensions, Certificate, CertificateVerify and Finished. Certificate chain, hostname and signature verification are modeled as successful.',
              () =>
                send(
                  connection.client,
                  'TLS client Finished',
                  58,
                  'Encrypted Finished authenticates the handshake transcript. Application traffic keys protect subsequent TLS records.',
                  () => {
                    connection.secure = true;
                    this.event(
                      `TLS ${connection.id} established: independent application traffic keys.`,
                    );
                    onComplete();
                  },
                ),
            ),
        ),
    );
  }
  udpSetup() {
    this.stage(
      3,
      'Prepare a TURN-relayed media path.',
      'Authenticated signaling, TURN allocations, channel bindings and NAT permissions are assumed established. UDP itself has no connection handshake.',
    );
    this.schedule(1, () => this.startDtlsHandshake());
  }
  private startDtlsHandshake() {
    this.stage(
      4,
      'Establish end-to-end media keys.',
      'Representative DTLS-SRTP flights are carried inside TURN ChannelData. The phones authenticate certificate fingerprints via trusted signaling. The relay forwards the channel data and does not terminate SRTP.',
    );
    const flights: MediaFlight[] = [
      {
        from: 0,
        to: 9,
        label: 'DTLS ClientHello',
        bytes: 220,
        security: 'DTLS key share and use_srtp negotiation inside TURN ChannelData.',
      },
      {
        from: 9,
        to: 0,
        label: 'DTLS server handshake flight',
        bytes: 1000,
        security:
          'Grouped representative DTLS server flight. Peer fingerprint and transcript checks are modeled as successful.',
      },
      {
        from: 0,
        to: 9,
        label: 'DTLS client Finished',
        bytes: 180,
        security: 'Representative DTLS Finished flight. SRTP keys are derived at the phones.',
      },
    ];
    this.sendDtlsFlights(flights);
  }
  private sendDtlsFlights(flights: MediaFlight[], flightIndex = 0) {
    const flight = flights[flightIndex];
    if (!flight) {
      this.beginData();
      return;
    }
    this.udpEndToEnd(flight, () => this.sendDtlsFlights(flights, flightIndex + 1));
  }
  udpEndToEnd(flight: MediaFlight, onComplete: () => void) {
    const leg1 =
        flight.from === 0
          ? { from: 0, to: 6, connection: 'A', channel: 0x4000 }
          : { from: 9, to: 6, connection: 'B', channel: 0x4001 },
      leg2 =
        flight.from === 0
          ? { from: 6, to: 9, connection: 'B', channel: 0x4001 }
          : { from: 6, to: 0, connection: 'A', channel: 0x4000 };
    let finished = false,
      attempt = 0;
    const send = () => {
      if (finished) return;
      attempt++;
      if (attempt > 1) this.retries++;
      this.launch({ ...flight, ...leg1, kind: 'DTLS', turnChannel: true, attempt }, () =>
        this.launch({ ...flight, ...leg2, kind: 'DTLS', turnChannel: true, attempt }, () => {
          if (!finished) {
            finished = true;
            onComplete();
          }
        }),
      );
      this.schedule(15, send, () => !finished);
    };
    send();
  }
  beginData() {
    this.stage(
      5,
      'Encrypted payloads, two network legs. ',
      this.protocol === 'TCP'
        ? 'The relay unwraps TLS A, keeps the end-to-end ciphertext, then wraps it in TLS B. A transport ACK is local to one connection.'
        : 'The relay forwards end-to-end SRTP ciphertext. UDP has no transport-level ACK, ordering or retransmission. Missing media frames leave gaps.',
    );
    this.scheduleDataChunks();
  }
  private scheduleDataChunks() {
    for (let chunkIndex = 0; chunkIndex < 4; chunkIndex++)
      this.schedule(chunkIndex * 0.85, () => this.sendData(chunkIndex, 'A'));
  }
  sendData(chunkIndex: number, leg: 'A' | 'B') {
    const from = leg === 'A' ? 0 : 6,
      to = leg === 'A' ? 6 : 9;
    const onDelivered = () => this.markChunkDelivered(chunkIndex, leg);
    const packetSpec: Pick<PacketSpec, 'kind' | 'chunk' | 'leg'> = {
      kind: 'DATA',
      chunk: chunkIndex,
      leg,
    };
    if (this.protocol === 'TCP') {
      this.sendTcpData(chunkIndex, leg, from, onDelivered, packetSpec);
      return;
    }
    this.sendUdpData(chunkIndex, leg, from, to, onDelivered, packetSpec);
  }
  private markChunkDelivered(chunkIndex: number, leg: 'A' | 'B') {
    this.arrived[leg === 'A' ? 0 : 1][chunkIndex] = true;
    if (leg === 'A' && !this.forwarded.has(chunkIndex)) {
      this.forwarded.add(chunkIndex);
      this.schedule(0.3, () => this.sendData(chunkIndex, 'B'));
    }
    this.revision++;
  }
  private sendTcpData(
    chunkIndex: number,
    leg: 'A' | 'B',
    from: number,
    onDelivered: () => void,
    packetSpec: Pick<PacketSpec, 'kind' | 'chunk' | 'leg'>,
  ) {
    this.tcpPayload(
      this.connections[leg],
      from,
      `Encrypted payload #${chunkIndex + 1}`,
      1000,
      `TLS ${leg} application ciphertext enclosing end-to-end message ciphertext. Relay can remove TLS, not the inner encryption.`,
      onDelivered,
      packetSpec,
    );
  }
  private sendUdpData(
    chunkIndex: number,
    leg: 'A' | 'B',
    from: number,
    to: number,
    onDelivered: () => void,
    packetSpec: Pick<PacketSpec, 'kind' | 'chunk' | 'leg'>,
  ) {
    this.launch(
      {
        from,
        to,
        label: `SRTP voice frame #${chunkIndex + 1}`,
        connection: leg,
        bytes: 192,
        turnChannel: true,
        channel: leg === 'A' ? 0x4000 : 0x4001,
        security:
          'SRTP-protected media is the inner content. TURN ChannelData adds relay framing but does not decrypt SRTP.',
        rtpSeq: 4000 + chunkIndex,
        ...packetSpec,
      },
      onDelivered,
    );
  }
  tick(dt: number) {
    if (!this.running || this.paused) return;
    this.time += dt;
    this.runScheduledJobs();
    this.advanceInFlightPackets().forEach((packet) => {
      packet.arrive?.(packet);
    });
    this.removeInvalidJobs();
    this.completeRunIfIdle();
  }
  private runScheduledJobs() {
    const dueJobs = this.jobs.filter((job) => job.at <= this.time && job.valid());
    this.jobs = this.jobs.filter((job) => job.at > this.time && job.valid());
    dueJobs.forEach((job) => {
      job.fn();
    });
  }
  private advanceInFlightPackets() {
    const arrivals: Packet[] = [];
    for (const packet of this.packets) {
      if (packet.status !== 'in flight') continue;
      if (this.advancePacket(packet)) arrivals.push(packet);
    }
    return arrivals;
  }
  private advancePacket(packet: Packet) {
    const progress = Math.min(1, (this.time - packet.start) / packet.duration);
    const reachedHop = Math.min(
      packet.route.length - 1,
      Math.floor(progress * (packet.route.length - 1)),
    );
    this.recordReachedHops(packet, reachedHop);
    if (this.shouldDropPacket(packet)) {
      this.drop(packet);
      this.dropRule = null;
      return false;
    }
    if (progress < 1) return false;
    packet.status = 'received';
    packet.history.push({ time: this.time, text: `Received at ${NODES[packet.to].name}.` });
    return true;
  }
  private recordReachedHops(packet: Packet, reachedHop: number) {
    while (packet.hop < reachedHop) {
      packet.hop++;
      packet.snapshots.push(this.snapshot(packet, packet.hop));
      const node = packet.route[packet.hop];
      const crossedGateway = [1, 8].includes(node) && !['ARP', 'DNS'].includes(packet.kind);
      packet.history.push({
        time: this.time,
        text: `${NODES[node].name}${crossedGateway ? ' · NAT translation / forwarding' : ''}.`,
      });
      this.revision++;
    }
  }
  private shouldDropPacket(packet: Packet) {
    return !!(
      this.dropRule &&
      packet.kind === 'DATA' &&
      packet.chunk === this.dropRule.chunk &&
      packet.leg === this.dropRule.leg &&
      packet.route[packet.hop] === this.dropRule.node
    );
  }
  private removeInvalidJobs() {
    this.jobs = this.jobs.filter((job) => job.valid());
  }
  private completeRunIfIdle() {
    if (this.jobs.length || this.packets.some((packet) => packet.status === 'in flight')) return;
    this.running = false;
    this.complete = true;
    this.phase = 6;
    this.title =
      this.delivered === 4 ? 'The recipient has all four payloads.' : 'The recipient has a gap.';
    this.description =
      this.protocol === 'TCP'
        ? 'All bytes were delivered in order. Connections remain open for the next message; FIN / close is outside this run.'
        : `${this.delivered} of 4 media frames arrived. SRTP protects integrity and confidentiality, but UDP does not recover missing media.`;
    this.event('Journey complete.');
  }
  get delivered() {
    return this.arrived[1].filter(Boolean).length;
  }
}
