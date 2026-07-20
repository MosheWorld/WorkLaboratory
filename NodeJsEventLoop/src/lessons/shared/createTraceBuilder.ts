import type { ConsoleEntry, EventLoopPhase, RuntimeLocation, RuntimeToken, SimulationSnapshot } from "../../domain/simulation/types";

export interface TraceBuilder {
  readonly placeToken: (id: string, label: string, location: RuntimeLocation) => void;
  readonly removeToken: (id: string) => void;
  readonly recordSnapshot: (id: string, line: number, title: string, explanation: string) => void;
  readonly enterCall: (id: string, label: string, line: number, explanation: string) => void;
  readonly returnFromCall: (id: string, label: string, line: number) => void;
  readonly writeConsole: (id: string, value: string, line: number) => void;
  readonly scheduleCallback: (id: string, label: string, api: string, location: RuntimeLocation, line: number, explanation: string) => void;
  readonly runLoggingCallback: (id: string, label: string, value: string, line: number) => void;
  readonly setActivePhase: (phase: EventLoopPhase | null) => void;
  readonly build: () => readonly SimulationSnapshot[];
}

// Owns snapshot state and reusable call, queue, and console lifecycles.
export const createTraceBuilder = (): TraceBuilder => {
  const snapshots: SimulationSnapshot[] = [];
  let tokens: RuntimeToken[] = [];
  let consoleEntries: ConsoleEntry[] = [];
  let activePhase: EventLoopPhase | null = null;
  const placeToken = (id: string, label: string, location: RuntimeLocation): void => {
    tokens = [...tokens.filter((item) => item.id !== id), { id, label, location }];
  };
  const removeToken = (id: string): void => { tokens = tokens.filter((item) => item.id !== id); };
  const recordSnapshot = (id: string, line: number, title: string, explanation: string): void => {
    snapshots.push({ id, activeLineNumber: line, transitionTitle: title, explanation, tokens: [...tokens], consoleEntries: [...consoleEntries], activePhase });
  };
  const enterCall = (id: string, label: string, line: number, explanation: string): void => {
    placeToken(id, label, "call-stack");
    recordSnapshot(`${id}-enter`, line, `Enter ${label}`, explanation);
  };
  const returnFromCall = (id: string, label: string, line: number): void => {
    const executingFrame = tokens.filter((token) => token.location === "call-stack").at(-1);
    if (executingFrame?.id !== id) {
      throw new Error(`Cannot return from ${id}: it is not the executing stack frame.`);
    }
    removeToken(id);
    recordSnapshot(`${id}-return`, line, `${label} returns`, tokens.some((item) => item.location === "call-stack")
      ? "Pop this frame. Execution resumes in the caller beneath it; queued work still waits."
      : "The stack is empty. Node checks nextTick and V8 microtasks before continuing with phase callbacks.");
  };
  const writeConsole = (id: string, value: string, line: number): void => {
    const label = `console.log('${value}')`;
    consoleEntries = [...consoleEntries, { id, value }];
    enterCall(`log-${id}`, label, line, "Push console.log above its caller. It writes its output during this synchronous call, while queued callbacks still wait.");
    returnFromCall(`log-${id}`, "console.log", line);
  };
  const scheduleCallback = (id: string, label: string, api: string, location: RuntimeLocation, line: number, explanation: string): void => {
    enterCall(`${id}-registration`, api, line, "The scheduling API is a synchronous call. Its callback body does not execute during registration.");
    placeToken(id, label, location);
    recordSnapshot(`${id}-queued`, line, `Register ${label}`, explanation);
    returnFromCall(`${id}-registration`, api, line);
  };
  const runLoggingCallback = (id: string, label: string, value: string, line: number): void => {
    enterCall(id, label, line, "Move this eligible callback from its queue to the empty call stack. Its body has not logged yet.");
    writeConsole(id, value, line);
    returnFromCall(id, label, line);
  };

  return {
    placeToken, removeToken, recordSnapshot, enterCall, returnFromCall,
    writeConsole, scheduleCallback, runLoggingCallback,
    setActivePhase: (phase: EventLoopPhase | null): void => { activePhase = phase; },
    build: (): readonly SimulationSnapshot[] => [...snapshots],
  };
};
