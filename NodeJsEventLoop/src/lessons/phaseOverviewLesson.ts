import type { EventLoopCycleStage, LessonDefinition } from "../domain/simulation/types";

interface CycleTransition {
  readonly id: string;
  readonly title: string;
  readonly stage: EventLoopCycleStage;
  readonly activeLineNumber: number;
  readonly explanation: string;
}

const cycleTransitions: readonly CycleTransition[] = [
  { id: "alive-check", title: "Check whether the loop is alive", stage: "alive-check", activeLineNumber: 1, explanation: "This simplified map follows a regular iteration in Node.js 22+ using libuv's modern timer ordering. Before entering the loop, libuv also performs an initial timer pass for compatibility. A listening server, pending file read, or referenced timer can keep the loop alive." },
  { id: "pending-callbacks", title: "Run deferred system callbacks", stage: "pending", activeLineNumber: 2, explanation: "libuv processes certain deferred system callbacks, such as TCP connection-refused processing on some Unix systems. Registering an error listener does not select this phase: delivery depends on the operation and platform. Ordinary file and network results normally run during poll." },
  { id: "pending-priority", title: "Drain priority work after a pending callback", stage: "pending-priority-checkpoint", activeLineNumber: 3, explanation: "When a Node-dispatched callback returns to Node, a checkpoint drains nextTick work and then V8 microtasks before phase processing continues. This is not a checkpoint after every synchronous function or EventEmitter listener." },
  { id: "idle-handles", title: "Run libuv's internal idle work", stage: "idle", activeLineNumber: 4, explanation: "This is internal libuv bookkeeping. Application code does not schedule console.log, Promises, timers, or I/O here, so there is intentionally no JavaScript API example." },
  { id: "prepare-handles", title: "Prepare to wait for I/O", stage: "prepare", activeLineNumber: 5, explanation: "libuv and Node perform internal preparation immediately before poll, including deciding how the upcoming wait should behave. This is infrastructure, not an application callback queue." },
  { id: "poll-io", title: "Receive and run ready I/O", stage: "poll", activeLineNumber: 6, explanation: "Poll receives ready socket events and completed file-system work, then eligible JavaScript callbacks return to the call stack. Examples include fs.readFile callbacks, server request handlers, and socket data handlers." },
  { id: "poll-priority", title: "Drain priority work after an I/O callback", stage: "poll-priority-checkpoint", activeLineNumber: 7, explanation: "After the I/O callback returns to Node, nextTicks drain before V8 microtasks. V8 finishes draining its microtask queue before Node handles nextTicks created by those microtasks. The checkpoint repeats as needed before phase processing resumes." },
  { id: "check-handles", title: "Run setImmediate callbacks", stage: "check", activeLineNumber: 8, explanation: "Callbacks registered with setImmediate run in check, after poll. When setImmediate and setTimeout(..., 0) are scheduled together inside an I/O callback, the immediate runs first. At top level, their relative order is not guaranteed." },
  { id: "check-priority", title: "Drain priority work after setImmediate", stage: "check-priority-checkpoint", activeLineNumber: 9, explanation: "After a setImmediate callback returns, Node drains nextTick and then V8 microtasks before running another eligible callback." },
  { id: "close-callbacks", title: "Run close callbacks", stage: "close", activeLineNumber: 10, explanation: "Native handle close callbacks run here. A socket destroyed with an active native handle can emit its close event from this processing; other paths can use nextTick. A drained server's close event is scheduled through nextTick, so server.on('close') is not an example of this phase." },
  { id: "close-priority", title: "Drain priority work after a close callback", stage: "close-priority-checkpoint", activeLineNumber: 11, explanation: "If a close callback scheduled nextTick or Promise work, Node drains it now before continuing the libuv cycle." },
  { id: "update-time", title: "Refresh libuv's clock", stage: "update-time", activeLineNumber: 12, explanation: "libuv updates its cached time so timer thresholds can be compared efficiently. No user JavaScript callback is executed during this bookkeeping step." },
  { id: "run-timers", title: "Run timers whose thresholds passed", stage: "timers", activeLineNumber: 13, explanation: "In regular iterations with libuv 1.45+, timer processing follows poll, check, and close processing. The initial timer pass before loop entry is separate. Node clamps setTimeout(callback, 0) to 1 ms; that threshold makes the callback eligible, without guaranteeing its execution time." },
  { id: "timers-priority", title: "Drain priority work after a timer callback", stage: "timers-priority-checkpoint", activeLineNumber: 14, explanation: "After each timer callback returns, Node drains nextTick and V8 microtasks before taking the next timer callback. Learning path 08 demonstrates this exact behavior." },
  { id: "repeat-loop", title: "Repeat or let Node exit", stage: "repeat", activeLineNumber: 15, explanation: "If referenced work remains, another iteration begins. A listening server, interval, open socket, or pending request can keep the loop alive. Otherwise uv_run returns and Node can exit." },
];

export const phaseOverviewLesson: LessonDefinition = {
  id: "event-loop-cycle-overview",
  title: "Meet the libuv event loop cycle",
  level: "intermediate",
  focus: "phase-overview",
  description: "Follow a simplified regular loop iteration in Node.js 22+, see which operations belong to each phase, and distinguish phase callbacks from priority checkpoints.",
  takeaway: "At checkpoints after Node-dispatched callbacks, nextTick work drains before V8 microtasks. A nextTick queued by a microtask waits for the current microtask drain to finish.",
  sourceCode: ["is the loop alive?", "run a pending callback", "drain its nextTick and microtask work", "run internal idle handles", "prepare to poll", "run a ready I/O callback", "drain its nextTick and microtask work", "run a setImmediate callback", "drain its nextTick and microtask work", "run a close callback", "drain its nextTick and microtask work", "update loop time", "run a due timer callback", "drain its nextTick and microtask work", "repeat while work remains"],
  snapshots: cycleTransitions.map((transition) => ({
    id: transition.id,
    transitionTitle: transition.title,
    activeLineNumber: transition.activeLineNumber,
    tokens: [],
    consoleEntries: [],
    activePhase: null,
    activeCycleStage: transition.stage,
    explanation: transition.explanation,
  })),
};
