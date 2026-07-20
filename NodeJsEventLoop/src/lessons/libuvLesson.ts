import type { LessonDefinition } from "../domain/simulation/types";
import { createLibuvTrace } from "./libuv/createLibuvTrace";
import { libuvSourceCode } from "./libuv/lessonSource";

export const libuvLesson: LessonDefinition = {
  id: "complete-event-loop-challenge",
  title: "Final challenge: one request through the entire runtime",
  level: "advanced",
  focus: "complete-runtime",
  description: "Trace a local Axios request through a server socket, file-system worker, libuv phase queues, nextTick, Promises, await, timers, setImmediate, and close callbacks.",
  takeaway: "Background systems make work ready, phase queues select callbacks, and Node drains nextTick plus V8 microtasks every time JavaScript returns.",
  sourceCode: libuvSourceCode,
  snapshots: createLibuvTrace(),
};
