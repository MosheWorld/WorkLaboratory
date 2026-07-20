import type { TraceBuilder } from "../shared/createTraceBuilder";
import { sourceLine } from "./lessonSource";

export const traceServerShutdown = (trace: TraceBuilder): void => {
  trace.enterCall("close-server", "server.close()", sourceLine("closeServer"), "Stop accepting new connections and register the close listener. Closing is asynchronous.");
  trace.placeToken("server-socket", "server socket: closing", "operating-system");
  trace.placeToken("axios-socket", "HTTP connection: closing", "operating-system");
  trace.recordSnapshot("begin-close", sourceLine("closeServer"), "Begin native connection cleanup", "The listening handle and remaining connection must finish closing. Calling server.close() does not execute its callback inline.");
  trace.returnFromCall("close-server", "server.close()", sourceLine("closeServer"));
  trace.returnFromCall("axios-continuation", "requestUser", sourceLine("endRequestUser"));
  trace.setActivePhase("close-callbacks");
  trace.recordSnapshot("close-handles", sourceLine("closeServer"), "Finish native handle cleanup", "This trace groups socket shutdown and native close processing. The server's JavaScript close event is scheduled separately once its handle and connections are drained.");
  trace.removeToken("server-socket");
  trace.removeToken("axios-socket");
  trace.placeToken("server-close", "server close notification", "next-tick-queue");
  trace.setActivePhase(null);
  trace.recordSnapshot("queue-server-close", sourceLine("closeServer"), "Queue the server close notification", "Node schedules the drained server's close event using nextTick. A server.close listener should not be confused with a native socket close callback in libuv's close phase.");
  trace.runLoggingCallback("server-close", "server.close callback", "server closed", sourceLine("closeServer"));
  trace.recordSnapshot("complete", sourceLine("closeServer"), "No referenced work remains", "All application frames returned and the illustrated queues and handles are empty. Node can finish this run. The native and library internals were grouped, while every application console.log had its own stack frame.");
};
