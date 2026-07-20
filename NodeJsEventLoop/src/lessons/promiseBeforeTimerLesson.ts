import type { LessonDefinition } from "../domain/simulation/types";

const outputOne = { id: "output-one", value: "1" } as const;
const outputTwo = { id: "output-two", value: "2" } as const;
const outputBoo = { id: "output-boo", value: "boo" } as const;
const timerWaiting = { id: "foo-timer", label: "foo timer · minimum 1 ms", location: "node-timers" } as const;
const timerCallback = { id: "foo-callback", label: "foo callback", location: "timers-queue" } as const;
const promiseCallback = { id: "boo-callback", label: "boo Promise.then", location: "microtask-queue" } as const;

export const promiseBeforeTimerLesson: LessonDefinition = {
  id: "promise-before-timer",
  title: "A queued Promise handler runs before a ready timer",
  level: "foundation",
  focus: "queues",
  description: "Compare one Promise microtask with one zero-delay timer after synchronous code finishes.",
  takeaway: "After the current script, Node drains queued Promise microtasks before selecting an eligible timer callback.",
  sourceCode: [
    "console.log(1);",
    "setTimeout(() => {",
    "  console.log('foo');",
    "}, 0);",
    "Promise.resolve().then(() => {",
    "  console.log('boo');",
    "});",
    "console.log(2);",
  ],
  snapshots: [
    { id: "load-main", transitionTitle: "Node loads the main module", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "The complete script starts as one synchronous operation on the call stack." },
    { id: "call-log-one", transitionTitle: "Call console.log(1)", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-one", label: "console.log(1)", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "The first console.log call enters the stack and executes immediately." },
    { id: "print-one", transitionTitle: "Print 1 and continue", activeLineNumber: 2, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "console.log returns, and the main module moves to the timer registration." },
    { id: "call-timeout", transitionTitle: "Call setTimeout", activeLineNumber: 2, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "timeout-call", label: "setTimeout(..., 0)", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "setTimeout is called synchronously. The foo callback does not execute during this call." },
    { id: "register-timer", transitionTitle: "Register the foo timer", activeLineNumber: 4, tokens: [{ id: "main", label: "main module", location: "call-stack" }, timerWaiting], consoleEntries: [outputOne], activePhase: null, explanation: "Node tracks a minimum 1 ms threshold for the timer. Zero does not mean immediate execution." },
    { id: "evaluate-promise", transitionTitle: "Evaluate Promise.resolve().then(...)", activeLineNumber: 5, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "promise-call", label: "Promise.resolve().then(...)", location: "call-stack" }, timerWaiting], consoleEntries: [outputOne], activePhase: null, explanation: "JavaScript creates an already-fulfilled Promise and calls then synchronously to register boo." },
    { id: "queue-promise", transitionTitle: "Queue the boo Promise handler", activeLineNumber: 7, tokens: [{ id: "main", label: "main module", location: "call-stack" }, timerWaiting, promiseCallback], consoleEntries: [outputOne], activePhase: null, explanation: "V8 places the registered then handler in the microtask queue. It waits while the main script continues." },
    { id: "call-log-two", transitionTitle: "Call console.log(2)", activeLineNumber: 8, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-two", label: "console.log(2)", location: "call-stack" }, timerWaiting, promiseCallback], consoleEntries: [outputOne], activePhase: null, explanation: "Synchronous JavaScript still has priority over both queued and external asynchronous work." },
    { id: "finish-main", transitionTitle: "Print 2 and finish the main module", activeLineNumber: 8, tokens: [timerWaiting, promiseCallback], consoleEntries: [outputOne, outputTwo], activePhase: null, explanation: "The main script is complete and the call stack is empty. Now Node reaches its scheduling checkpoint." },
    { id: "timer-ready", transitionTitle: "The foo timer becomes eligible", activeLineNumber: 2, tokens: [timerCallback, promiseCallback], consoleEntries: [outputOne, outputTwo], activePhase: null, explanation: "This walkthrough assumes the minimum timer threshold has now elapsed. The ready foo callback waits in the timers queue while the Promise microtask is also waiting." },
    { id: "select-microtask", transitionTitle: "Drain the microtask queue first", activeLineNumber: 5, tokens: [timerCallback, { id: "boo-callback", label: "boo Promise.then", location: "call-stack" }], consoleEntries: [outputOne, outputTwo], activePhase: null, explanation: "Even though foo is ready, Node runs the queued Promise handler before selecting a callback from an event-loop phase." },
    { id: "call-boo-log", transitionTitle: "Call console.log('boo')", activeLineNumber: 6, tokens: [timerCallback, { id: "boo-callback", label: "boo Promise.then", location: "call-stack" }, { id: "boo-log", label: "console.log('boo')", location: "call-stack" }], consoleEntries: [outputOne, outputTwo], activePhase: null, explanation: "The Promise handler runs as ordinary synchronous JavaScript. The ready timer remains queued and cannot interrupt it." },
    { id: "print-boo", transitionTitle: "Print boo and finish the microtask", activeLineNumber: 6, tokens: [timerCallback], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: null, explanation: "The microtask completes. The ready foo callback is still waiting, so Node can now continue to the timers phase." },
    { id: "select-timer", transitionTitle: "Run the foo timer callback", activeLineNumber: 3, tokens: [{ id: "foo-callback", label: "foo callback", location: "call-stack" }], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: "timers", explanation: "With the microtask queue empty, the timers phase moves foo onto the call stack." },
    { id: "call-foo-log", transitionTitle: "Call console.log('foo')", activeLineNumber: 3, tokens: [{ id: "foo-callback", label: "foo callback", location: "call-stack" }, { id: "foo-log", label: "console.log('foo')", location: "call-stack" }], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: "timers", explanation: "The timer callback invokes console.log as normal synchronous JavaScript." },
    { id: "complete", transitionTitle: "Print foo and complete", activeLineNumber: 3, tokens: [], consoleEntries: [outputOne, outputTwo, outputBoo, { id: "output-foo", value: "foo" }], activePhase: "timers", explanation: "Final output: 1, 2, boo, foo. The Promise microtask runs before the eligible timer callback." },
  ],
};
