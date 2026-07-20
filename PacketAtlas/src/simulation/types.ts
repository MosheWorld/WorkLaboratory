export type Protocol = 'TCP' | 'UDP';
import type { DEVICES } from './network-data';

export type Device = (typeof DEVICES)[number];

export interface PacketSnapshot {
  node: number;
  hop: number;
  time: number;
  src: string;
  dst: string;
  sport: number | null;
  dport: number | null;
  ttl: number | null;
  macSrc: string;
  macDst: string;
}

export interface PacketSpec {
  from: number;
  to: number;
  kind: string;
  label: string;
  connection: string;
  bytes: number;
  security: string;
  route?: number[];
  attempt?: number;
  root?: string;
  seq?: number;
  ack?: number | null;
  flags?: string;
  leg?: 'A' | 'B';
  chunk?: number;
  rtpSeq?: number;
  turnChannel?: boolean;
  channel?: number;
}

export interface Packet extends PacketSpec {
  id: string;
  start: number;
  status: 'in flight' | 'lost' | 'received';
  history: Array<{ time: number; text: string }>;
  snapshots: PacketSnapshot[];
  route: number[];
  attempt: number;
  root: string;
  hop: number;
  duration: number;
  arrive?: (packet: Packet) => void;
  acknowledged?: boolean;
  buffered?: boolean;
  lossTime?: number;
}

export interface ScheduledJob {
  at: number;
  fn: () => void;
  valid: () => boolean;
}

export interface TcpDescriptor {
  acked: boolean;
  attempt: number;
  seq: number;
  bytes: number;
  from: number;
  to: number;
  done?: () => void;
  extra: Partial<PacketSpec>;
  root?: string;
  delivered?: boolean;
}

export interface TcpReceiveState {
  next: number;
  pending: Map<number, TcpDescriptor>;
}

export interface TcpConnection {
  id: 'A' | 'B';
  client: number;
  server: number;
  nextClient: number;
  nextServer: number;
  rx: Record<number, TcpReceiveState>;
  acked: Set<number>;
  dataStart: number;
  sent?: TcpDescriptor[];
  secure?: boolean;
}

export type MediaFlight = Pick<PacketSpec, 'from' | 'to' | 'label' | 'bytes' | 'security'>;
