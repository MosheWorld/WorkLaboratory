import type { LessonDefinition } from "../domain/simulation/types";

const outputOne = { id: "output-one", value: "1" } as const;
const outputTwo = { id: "output-two", value: "2" } as const;
const outputThree = { id: "output-three", value: "3" } as const;

export const synchronousExecutionLesson: LessonDefinition = {
  id: "synchronous-execution",
  title: "Synchronous JavaScript runs in order",
  level: "foundation",
  focus: "synchronous",
  description: "Start with the call stack and run three synchronous statements from top to bottom.",
  takeaway: "Synchronous statements finish in source order, one call-stack frame at a time.",
  sourceCode: ["console.log(1);", "console.log(2);", "console.log(3);"],
  snapshots: [
    {
      id: "load-main",
      transitionTitle: "Node loads the main module",
      activeLineNumber: 1,
      tokens: [{ id: "main", label: "main module", location: "call-stack" }],
      consoleEntries: [],
      activePhase: null,
      explanation: "The complete script begins as synchronous work on the call stack.",
    },
    {
      id: "call-log-one",
      transitionTitle: "Call console.log(1)",
      activeLineNumber: 1,
      tokens: [
        { id: "main", label: "main module", location: "call-stack" },
        { id: "log-one", label: "console.log(1)", location: "call-stack" },
      ],
      consoleEntries: [],
      activePhase: null,
      explanation: "The first function call is pushed above the main module and executes immediately.",
    },
    {
      id: "print-one",
      transitionTitle: "Print 1 and return",
      activeLineNumber: 1,
      tokens: [{ id: "main", label: "main module", location: "call-stack" }],
      consoleEntries: [outputOne],
      activePhase: null,
      explanation: "console.log prints 1, returns, and leaves the call stack.",
    },
    {
      id: "call-log-two",
      transitionTitle: "Call console.log(2)",
      activeLineNumber: 2,
      tokens: [
        { id: "main", label: "main module", location: "call-stack" },
        { id: "log-two", label: "console.log(2)", location: "call-stack" },
      ],
      consoleEntries: [outputOne],
      activePhase: null,
      explanation: "JavaScript moves to the next statement only after the previous call returns.",
    },
    {
      id: "print-two",
      transitionTitle: "Print 2 and return",
      activeLineNumber: 2,
      tokens: [{ id: "main", label: "main module", location: "call-stack" }],
      consoleEntries: [outputOne, outputTwo],
      activePhase: null,
      explanation: "console.log prints 2 and returns control to the main module.",
    },
    {
      id: "call-log-three",
      transitionTitle: "Call console.log(3)",
      activeLineNumber: 3,
      tokens: [
        { id: "main", label: "main module", location: "call-stack" },
        { id: "log-three", label: "console.log(3)", location: "call-stack" },
      ],
      consoleEntries: [outputOne, outputTwo],
      activePhase: null,
      explanation: "The final synchronous function call enters the stack.",
    },
    {
      id: "print-three",
      transitionTitle: "Print 3 and return",
      activeLineNumber: 3,
      tokens: [{ id: "main", label: "main module", location: "call-stack" }],
      consoleEntries: [outputOne, outputTwo, outputThree],
      activePhase: null,
      explanation: "console.log prints 3 and returns to the main module.",
    },
    {
      id: "complete-main",
      transitionTitle: "Complete the main module",
      activeLineNumber: 3,
      tokens: [],
      consoleEntries: [outputOne, outputTwo, outputThree],
      activePhase: null,
      explanation: "The script is complete. Synchronous JavaScript produced 1, 2, 3 in source order.",
    },
  ],
};
