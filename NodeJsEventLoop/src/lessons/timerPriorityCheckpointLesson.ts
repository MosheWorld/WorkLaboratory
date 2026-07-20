import type { ConsoleEntry, LessonDefinition, RuntimeToken } from "../domain/simulation/types";

const timerOneOutput = { id: "timer-one-output", value: "timer 1" } as const;
const nextTickOutput = { id: "next-tick-output", value: "nextTick" } as const;
const promiseOutput = { id: "promise-output", value: "promise" } as const;

const timerOneWaiting = { id: "timer-one", label: "timer 1 · minimum 1 ms", location: "node-timers" } as const;
const timerTwoWaiting = { id: "timer-two", label: "timer 2 · minimum 1 ms", location: "node-timers" } as const;
const timerOneReady = { id: "timer-one", label: "timer 1 callback", location: "timers-queue" } as const;
const timerTwoReady = { id: "timer-two", label: "timer 2 callback", location: "timers-queue" } as const;
const timerOneRunning = { id: "timer-one", label: "timer 1 callback", location: "call-stack" } as const;
const nextTickWaiting = { id: "next-tick", label: "nextTick callback", location: "next-tick-queue" } as const;
const promiseWaiting = { id: "promise", label: "Promise.then callback", location: "microtask-queue" } as const;
const nextTickRunning = { ...nextTickWaiting, location: "call-stack" } as const;
const promiseRunning = { ...promiseWaiting, location: "call-stack" } as const;

const mainModule = { id: "main", label: "main module", location: "call-stack" } as const;
const noOutput: readonly ConsoleEntry[] = [];

const withMain = (...tokens: readonly RuntimeToken[]): readonly RuntimeToken[] => [mainModule, ...tokens];

export const timerPriorityCheckpointLesson: LessonDefinition = {
  id: "priority-checkpoint-between-timers",
  title: "Priority queues drain between timer callbacks",
  level: "intermediate",
  focus: "timer-priority",
  description: "Prove that nextTick and Promise microtasks run after one timer callback and before the next timer callback in the same timers phase.",
  takeaway: "After each callback, Node drains nextTick and then V8 microtasks before selecting another phase callback.",
  sourceCode: [
    "setTimeout(() => {",
    "  console.log('timer 1');",
    "  process.nextTick(() => console.log('nextTick'));",
    "  Promise.resolve().then(() => console.log('promise'));",
    "}, 0);",
    "setTimeout(() => {",
    "  console.log('timer 2');",
    "}, 0);",
  ],
  snapshots: [
    { id: "load-main", transitionTitle: "Start the main module", activeLineNumber: 1, tokens: [mainModule], consoleEntries: noOutput, activePhase: null, explanation: "The complete top-level script begins as synchronous work on the call stack." },
    { id: "call-timer-one", transitionTitle: "Call the first setTimeout", activeLineNumber: 1, tokens: withMain({ id: "timer-one-call", label: "setTimeout(..., 0)", location: "call-stack" }), consoleEntries: noOutput, activePhase: null, explanation: "setTimeout is called synchronously. Its callback does not execute during registration." },
    { id: "register-timer-one", transitionTitle: "Register timer 1", activeLineNumber: 5, tokens: withMain(timerOneWaiting), consoleEntries: noOutput, activePhase: null, explanation: "Node tracks timer 1 until its minimum threshold has passed. A zero delay becomes a minimum delay of about 1 ms in Node." },
    { id: "call-timer-two", transitionTitle: "Call the second setTimeout", activeLineNumber: 6, tokens: withMain(timerOneWaiting, { id: "timer-two-call", label: "setTimeout(..., 0)", location: "call-stack" }), consoleEntries: noOutput, activePhase: null, explanation: "The main module continues and synchronously registers the second timer." },
    { id: "register-timer-two", transitionTitle: "Register timer 2", activeLineNumber: 8, tokens: withMain(timerOneWaiting, timerTwoWaiting), consoleEntries: noOutput, activePhase: null, explanation: "Both timers now wait outside the call stack. Their callbacks still have not run." },
    { id: "finish-main", transitionTitle: "Finish the main module", activeLineNumber: 8, tokens: [timerOneWaiting, timerTwoWaiting], consoleEntries: noOutput, activePhase: null, explanation: "Top-level JavaScript finishes. Node can now enter event-loop processing." },
    { id: "timers-ready", transitionTitle: "Both timer callbacks become eligible", activeLineNumber: 1, tokens: [timerOneReady, timerTwoReady], consoleEntries: noOutput, activePhase: "timers", explanation: "This walkthrough assumes both minimum thresholds have passed. Registration order places timer 1 before timer 2 in the timers phase queue." },
    { id: "run-timer-one", transitionTitle: "Select timer 1", activeLineNumber: 1, tokens: [timerOneRunning, timerTwoReady], consoleEntries: noOutput, activePhase: "timers", explanation: "The timers phase moves only timer 1 onto the call stack. Timer 2 remains queued." },
    { id: "call-timer-one-log", transitionTitle: "Call console.log for timer 1", activeLineNumber: 2, tokens: [timerOneRunning, { id: "timer-one-log", label: "console.log('timer 1')", location: "call-stack" }, timerTwoReady], consoleEntries: noOutput, activePhase: "timers", explanation: "The callback runs normal synchronous JavaScript. Timer 2 cannot interrupt it." },
    { id: "print-timer-one", transitionTitle: "Print timer 1", activeLineNumber: 3, tokens: [timerOneRunning, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: "timers", explanation: "console.log returns, but timer 1 still has two scheduling calls to execute." },
    { id: "call-next-tick", transitionTitle: "Call process.nextTick", activeLineNumber: 3, tokens: [timerOneRunning, { id: "next-tick-call", label: "process.nextTick(...) ", location: "call-stack" }, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: "timers", explanation: "process.nextTick is called synchronously to register a callback in Node's dedicated nextTick queue." },
    { id: "queue-next-tick", transitionTitle: "Queue the nextTick callback", activeLineNumber: 3, tokens: [timerOneRunning, nextTickWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: "timers", explanation: "The nextTick callback waits. Timer 1 continues executing on the stack." },
    { id: "call-promise", transitionTitle: "Evaluate the Promise chain", activeLineNumber: 4, tokens: [timerOneRunning, { id: "promise-call", label: "Promise.resolve().then(...) ", location: "call-stack" }, nextTickWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: "timers", explanation: "JavaScript creates an already-fulfilled Promise and registers its then handler synchronously." },
    { id: "queue-promise", transitionTitle: "Queue the Promise handler", activeLineNumber: 4, tokens: [timerOneRunning, nextTickWaiting, promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: "timers", explanation: "V8 places the then handler in its microtask queue. Both priority callbacks wait until timer 1 returns." },
    { id: "finish-timer-one", transitionTitle: "Timer 1 returns", activeLineNumber: 5, tokens: [nextTickWaiting, promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: null, explanation: "The call stack becomes empty. Before selecting timer 2, Node reaches the priority checkpoint." },
    { id: "run-next-tick", transitionTitle: "Drain the nextTick queue first", activeLineNumber: 3, tokens: [nextTickRunning, promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: null, explanation: "Node moves the nextTick callback to the call stack before V8 microtasks and before another timer callback." },
    { id: "call-next-tick-log", transitionTitle: "Call console.log for nextTick", activeLineNumber: 3, tokens: [nextTickRunning, { id: "next-tick-log", label: "console.log('nextTick')", location: "call-stack" }, promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput], activePhase: null, explanation: "The nextTick callback now runs its synchronous console.log call above its own stack frame." },
    { id: "print-next-tick", transitionTitle: "Print nextTick", activeLineNumber: 3, tokens: [nextTickRunning, promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput], activePhase: null, explanation: "console.log returns to the nextTick callback. The nextTick queue is empty, so Node can move on to V8 microtasks after this callback returns." },
    { id: "finish-next-tick", transitionTitle: "Return from the nextTick callback", activeLineNumber: 3, tokens: [promiseWaiting, timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput], activePhase: null, explanation: "The nextTick callback returns. Node immediately drains the V8 microtask queue next." },
    { id: "run-promise", transitionTitle: "Drain the Promise microtask", activeLineNumber: 4, tokens: [promiseRunning, timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput], activePhase: null, explanation: "The Promise handler moves to the call stack while timer 2 remains in the timers phase queue." },
    { id: "call-promise-log", transitionTitle: "Call console.log for promise", activeLineNumber: 4, tokens: [promiseRunning, { id: "promise-log", label: "console.log('promise')", location: "call-stack" }, timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput], activePhase: null, explanation: "The Promise handler runs its synchronous console.log call above its own stack frame." },
    { id: "print-promise", transitionTitle: "Print promise", activeLineNumber: 4, tokens: [promiseRunning, timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput, promiseOutput], activePhase: null, explanation: "console.log returns to the Promise handler. Timer 2 remains queued until the handler returns." },
    { id: "finish-promise", transitionTitle: "Return from the Promise handler", activeLineNumber: 4, tokens: [timerTwoReady], consoleEntries: [timerOneOutput, nextTickOutput, promiseOutput], activePhase: null, explanation: "Both priority queues are empty. Node may now return to the timers phase queue." },
    { id: "run-timer-two", transitionTitle: "Select timer 2", activeLineNumber: 6, tokens: [{ ...timerTwoReady, location: "call-stack" }], consoleEntries: [timerOneOutput, nextTickOutput, promiseOutput], activePhase: "timers", explanation: "Only now does Node select the next eligible callback from the timers phase." },
    { id: "call-timer-two-log", transitionTitle: "Call console.log for timer 2", activeLineNumber: 7, tokens: [{ ...timerTwoReady, location: "call-stack" }, { id: "timer-two-log", label: "console.log('timer 2')", location: "call-stack" }], consoleEntries: [timerOneOutput, nextTickOutput, promiseOutput], activePhase: "timers", explanation: "Timer 2 executes as ordinary synchronous JavaScript." },
    { id: "complete", transitionTitle: "Print timer 2 and complete", activeLineNumber: 7, tokens: [], consoleEntries: [timerOneOutput, nextTickOutput, promiseOutput, { id: "timer-two-output", value: "timer 2" }], activePhase: "timers", explanation: "Final output: timer 1, nextTick, promise, timer 2. The priority queues drained between two callbacks from the same timers phase." },
  ],
};
