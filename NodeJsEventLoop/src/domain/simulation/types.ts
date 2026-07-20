export type RuntimeLocation =
  | "call-stack"
  | "node-timers"
  | "next-tick-queue"
  | "microtask-queue"
  | "timers-queue"
  | "poll-queue"
  | "check-queue"
  | "libuv-worker-pool"
  | "operating-system";

export type EventLoopPhase =
  | "timers"
  | "poll"
  | "check"
  | "close-callbacks";

export type LessonFocus = "synchronous" | "timers" | "queues" | "next-tick" | "timer-priority" | "phase-overview" | "complete-runtime";

export type EventLoopCycleStage =
  | "update-time"
  | "alive-check"
  | "timers"
  | "pending"
  | "idle"
  | "prepare"
  | "poll"
  | "check"
  | "close"
  | "pending-priority-checkpoint"
  | "poll-priority-checkpoint"
  | "check-priority-checkpoint"
  | "close-priority-checkpoint"
  | "timers-priority-checkpoint"
  | "repeat";

export interface RuntimeToken {
  readonly id: string;
  readonly label: string;
  readonly location: RuntimeLocation;
}

export interface ConsoleEntry {
  readonly id: string;
  readonly value: string;
}

export interface SimulationSnapshot {
  readonly id: string;
  readonly transitionTitle: string;
  readonly activeLineNumber: number;
  readonly tokens: readonly RuntimeToken[];
  readonly consoleEntries: readonly ConsoleEntry[];
  readonly explanation: string;
  readonly activePhase: EventLoopPhase | null;
  readonly activeCycleStage?: EventLoopCycleStage;
}

export interface LessonDefinition {
  readonly id: string;
  readonly title: string;
  readonly level: "foundation" | "intermediate" | "advanced";
  readonly focus: LessonFocus;
  readonly description: string;
  readonly takeaway: string;
  readonly sourceCode: readonly string[];
  readonly snapshots: readonly SimulationSnapshot[];
}

export interface SimulationSession {
  readonly lesson: LessonDefinition;
  readonly snapshotIndex: number;
}
