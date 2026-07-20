import type { LessonDefinition } from "../domain/simulation/types";

const outputOne = { id: "output-one", value: "1" } as const;
const outputThree = { id: "output-three", value: "3" } as const;
const timerCallback = { id: "timer-callback", label: "timer callback", location: "timers-queue" } as const;

export const timerIntroductionLesson: LessonDefinition = {
  id: "timer-introduction",
  title: "A timer does not interrupt JavaScript",
  level: "foundation",
  focus: "timers",
  description: "Follow every operation from loading the script to running the timer callback.",
  takeaway: "A timer delay makes a callback eligible, it never interrupts JavaScript that is already running.",
  sourceCode: ["console.log(1);", "setTimeout(() => {", "  console.log(2);", "}, 0);", "console.log(3);"],
  snapshots: [
    { id: "load-main", transitionTitle: "Node loads the main module", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "The complete script starts as synchronous work on the call stack." },
    { id: "push-log-one", transitionTitle: "Call console.log(1)", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-one", label: "console.log(1)", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "console.log is pushed above the main module and executes immediately." },
    { id: "complete-log-one", transitionTitle: "Print 1 and return", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "The value is printed and console.log leaves the stack." },
    { id: "call-timeout", transitionTitle: "Call setTimeout", activeLineNumber: 2, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "set-timeout", label: "setTimeout(..., 0)", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "Calling setTimeout registers work. It does not execute the callback." },
    { id: "register-timer", transitionTitle: "Register the timer threshold", activeLineNumber: 4, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "timer-wait", label: "timer · minimum 1 ms", location: "node-timers" }], consoleEntries: [outputOne], activePhase: null, explanation: "Node clamps a delay below 1 ms to 1 ms. This is a minimum threshold, not an exact execution time." },
    { id: "push-log-three", transitionTitle: "Call console.log(3)", activeLineNumber: 5, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-three", label: "console.log(3)", location: "call-stack" }, { id: "timer-wait", label: "timer · minimum 1 ms", location: "node-timers" }], consoleEntries: [outputOne], activePhase: null, explanation: "Synchronous script execution continues. The timer cannot interrupt the current JavaScript operation." },
    { id: "finish-main", transitionTitle: "Print 3 and finish the main module", activeLineNumber: 5, tokens: [{ id: "timer-wait", label: "timer · minimum 1 ms", location: "node-timers" }], consoleEntries: [outputOne, outputThree], activePhase: null, explanation: "The main module and console.log return. The call stack is finally empty." },
    { id: "timer-ready", transitionTitle: "The timer threshold is reached", activeLineNumber: 2, tokens: [timerCallback], consoleEntries: [outputOne, outputThree], activePhase: "timers", explanation: "After at least the minimum delay, the callback becomes eligible. Other work can still delay its execution." },
    { id: "select-timer", transitionTitle: "The event loop selects the timer callback", activeLineNumber: 3, tokens: [{ id: "timer-callback", label: "timer callback", location: "call-stack" }], consoleEntries: [outputOne, outputThree], activePhase: "timers", explanation: "The timers phase can now move the ready callback onto the empty call stack." },
    { id: "push-log-two", transitionTitle: "Call console.log(2)", activeLineNumber: 3, tokens: [{ id: "timer-callback", label: "timer callback", location: "call-stack" }, { id: "log-two", label: "console.log(2)", location: "call-stack" }], consoleEntries: [outputOne, outputThree], activePhase: "timers", explanation: "The timer callback invokes console.log as normal synchronous JavaScript." },
    { id: "complete", transitionTitle: "Print 2 and complete", activeLineNumber: 3, tokens: [], consoleEntries: [outputOne, outputThree, { id: "output-two", value: "2" }], activePhase: "timers", explanation: "Everything is complete. The final output is 1, 3, 2." },
  ],
};
