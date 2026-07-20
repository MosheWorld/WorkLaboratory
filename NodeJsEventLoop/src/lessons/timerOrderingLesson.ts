import type { LessonDefinition } from "../domain/simulation/types";

const outputOne = { id: "output-one", value: "1" } as const;
const outputTwo = { id: "output-two", value: "2" } as const;
const outputBoo = { id: "output-boo", value: "boo" } as const;
const fooTimer = { id: "foo-timer", label: "foo timer · 3500 ms", location: "node-timers" } as const;
const booTimer = { id: "boo-timer", label: "boo timer · 1000 ms", location: "node-timers" } as const;

export const timerOrderingLesson: LessonDefinition = {
  id: "timer-readiness-order",
  title: "Timers run when their thresholds are reached",
  level: "foundation",
  focus: "timers",
  description: "Register two timers and discover why the second callback becomes eligible first.",
  takeaway: "Registration order does not override delay thresholds. The earliest eligible timer gets considered first.",
  sourceCode: [
    "console.log(1);",
    "setTimeout(() => {",
    "  console.log('foo');",
    "}, 3500);",
    "setTimeout(() => {",
    "  console.log('boo');",
    "}, 1000);",
    "console.log(2);",
  ],
  snapshots: [
    { id: "load-main", transitionTitle: "Node loads the main module", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "The script begins as one synchronous operation on the call stack." },
    { id: "call-log-one", transitionTitle: "Call console.log(1)", activeLineNumber: 1, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-one", label: "console.log(1)", location: "call-stack" }], consoleEntries: [], activePhase: null, explanation: "The first synchronous call executes immediately." },
    { id: "print-one", transitionTitle: "Print 1 and continue", activeLineNumber: 2, tokens: [{ id: "main", label: "main module", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "console.log returns, so Node continues to the first timer registration." },
    { id: "call-foo-timeout", transitionTitle: "Call the 3500 ms setTimeout", activeLineNumber: 2, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "foo-timeout-call", label: "setTimeout(foo, 3500)", location: "call-stack" }], consoleEntries: [outputOne], activePhase: null, explanation: "Calling setTimeout registers the foo callback. It does not run foo now." },
    { id: "register-foo-timer", transitionTitle: "Track the foo timer threshold", activeLineNumber: 4, tokens: [{ id: "main", label: "main module", location: "call-stack" }, fooTimer], consoleEntries: [outputOne], activePhase: null, explanation: "The foo callback cannot become eligible until at least 3500 ms have elapsed." },
    { id: "call-boo-timeout", transitionTitle: "Call the 1000 ms setTimeout", activeLineNumber: 5, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "boo-timeout-call", label: "setTimeout(boo, 1000)", location: "call-stack" }, fooTimer], consoleEntries: [outputOne], activePhase: null, explanation: "The main script keeps running and registers a second timer with a shorter delay." },
    { id: "register-boo-timer", transitionTitle: "Track the boo timer threshold", activeLineNumber: 7, tokens: [{ id: "main", label: "main module", location: "call-stack" }, fooTimer, booTimer], consoleEntries: [outputOne], activePhase: null, explanation: "Both timers are tracked, but boo has the earlier threshold even though it was registered second." },
    { id: "call-log-two", transitionTitle: "Call console.log(2)", activeLineNumber: 8, tokens: [{ id: "main", label: "main module", location: "call-stack" }, { id: "log-two", label: "console.log(2)", location: "call-stack" }, fooTimer, booTimer], consoleEntries: [outputOne], activePhase: null, explanation: "Synchronous JavaScript still has priority. Neither timer can interrupt the main module." },
    { id: "finish-main", transitionTitle: "Print 2 and finish the main module", activeLineNumber: 8, tokens: [fooTimer, booTimer], consoleEntries: [outputOne, outputTwo], activePhase: null, explanation: "The call stack becomes empty. The output is currently 1, 2." },
    { id: "boo-threshold", transitionTitle: "The 1000 ms threshold is reached", activeLineNumber: 5, tokens: [fooTimer, { id: "boo-callback", label: "boo callback", location: "timers-queue" }], consoleEntries: [outputOne, outputTwo], activePhase: "timers", explanation: "This walkthrough advances to the point where boo is eligible. The 3500 ms foo timer is still waiting." },
    { id: "run-boo-callback", transitionTitle: "Run the boo timer callback", activeLineNumber: 6, tokens: [fooTimer, { id: "boo-callback", label: "boo callback", location: "call-stack" }], consoleEntries: [outputOne, outputTwo], activePhase: "timers", explanation: "The timers phase moves the eligible boo callback onto the empty call stack." },
    { id: "print-boo", transitionTitle: "Print boo and return", activeLineNumber: 6, tokens: [fooTimer], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: "timers", explanation: "boo completes first because its timer threshold was reached first." },
    { id: "foo-threshold", transitionTitle: "The 3500 ms threshold is reached", activeLineNumber: 2, tokens: [{ id: "foo-callback", label: "foo callback", location: "timers-queue" }], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: "timers", explanation: "Later, foo finally becomes eligible. A timer delay is a minimum threshold, not a guaranteed execution time." },
    { id: "run-foo-callback", transitionTitle: "Run the foo timer callback", activeLineNumber: 3, tokens: [{ id: "foo-callback", label: "foo callback", location: "call-stack" }], consoleEntries: [outputOne, outputTwo, outputBoo], activePhase: "timers", explanation: "With the stack empty, Node can now execute the foo callback." },
    { id: "complete", transitionTitle: "Print foo and complete", activeLineNumber: 3, tokens: [], consoleEntries: [outputOne, outputTwo, outputBoo, { id: "output-foo", value: "foo" }], activePhase: "timers", explanation: "Final output: 1, 2, boo, foo. Eligibility follows elapsed thresholds, not registration order alone." },
  ],
};
