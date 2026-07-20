import type { LessonFocus } from "../../../domain/simulation/types";

interface RuntimeVisibility {
  readonly timerApis: boolean;
  readonly workerPool: boolean;
  readonly operatingSystem: boolean;
  readonly eventLoop: boolean;
  readonly nextTickQueue: boolean;
  readonly microtaskQueue: boolean;
  readonly callbackQueue: boolean;
}

export const visibilityByFocus: Readonly<Record<LessonFocus, RuntimeVisibility>> = {
  synchronous: { timerApis: false, workerPool: false, operatingSystem: false, eventLoop: false, nextTickQueue: false, microtaskQueue: false, callbackQueue: false },
  timers: { timerApis: true, workerPool: false, operatingSystem: false, eventLoop: true, nextTickQueue: false, microtaskQueue: false, callbackQueue: true },
  queues: { timerApis: true, workerPool: false, operatingSystem: false, eventLoop: true, nextTickQueue: false, microtaskQueue: true, callbackQueue: true },
  "next-tick": { timerApis: false, workerPool: false, operatingSystem: false, eventLoop: true, nextTickQueue: true, microtaskQueue: true, callbackQueue: true },
  "timer-priority": { timerApis: true, workerPool: false, operatingSystem: false, eventLoop: true, nextTickQueue: true, microtaskQueue: true, callbackQueue: true },
  "phase-overview": { timerApis: false, workerPool: false, operatingSystem: false, eventLoop: false, nextTickQueue: false, microtaskQueue: false, callbackQueue: false },
  "complete-runtime": { timerApis: true, workerPool: true, operatingSystem: true, eventLoop: true, nextTickQueue: true, microtaskQueue: true, callbackQueue: true },
};

export const focusLabelByFocus: Readonly<Record<LessonFocus, string>> = {
  synchronous: "Synchronous execution",
  timers: "Timers",
  queues: "Microtasks and timers",
  "next-tick": "Node queue priority",
  "timer-priority": "Priority queues between timers",
  "phase-overview": "Event loop overview",
  "complete-runtime": "Complete Node.js runtime",
};
