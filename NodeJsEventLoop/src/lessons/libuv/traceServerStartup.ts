import type { TraceBuilder } from "../shared/createTraceBuilder";
import { sourceLine } from "./lessonSource";

export const traceServerStartup = (trace: TraceBuilder): void => {
  trace.enterCall("main", "main module", sourceLine("importFileSystem"), "Node loads the CommonJS dependencies synchronously. This trace groups module internals and follows the application calls. Timer versus network timing is one possible execution, not a guaranteed total order.");
  trace.enterCall("create-server", "http.createServer()", sourceLine("createServer"), "Create the server object and store its request handler. The handler body waits for an incoming request.");
  trace.returnFromCall("create-server", "http.createServer()", sourceLine("createServer"));
  trace.enterCall("listen", "server.listen()", sourceLine("listen"), "Ask Node and libuv to bind a listening TCP socket.");
  trace.placeToken("server-socket", "listening TCP socket", "operating-system");
  trace.placeToken("listen-callback", "listening notification", "next-tick-queue");
  trace.recordSnapshot("listen-registered", sourceLine("listen"), "Open the socket and queue listening notification", "The socket keeps Node alive. Node schedules its listening event through nextTick; that event invokes the supplied listener. Internal event-emitter frames are grouped here.");
  trace.returnFromCall("listen", "server.listen()", sourceLine("listen"));
  trace.writeConsole("main-end", "main end", sourceLine("logMainEnd"));
  trace.returnFromCall("main", "main module", sourceLine("logMainEnd"));
  trace.enterCall("listen-callback", "server.listen callback", sourceLine("listen"), "The main module has returned. Node drains the listening notification and invokes the listener on the stack.");
  trace.writeConsole("server-listening", "server listening", sourceLine("logListening"));
  trace.enterCall("read-file", "fs.readFile()", sourceLine("readFile"), "Call the file API on the JavaScript stack before submitting native work.");
  trace.placeToken("file-work", "file read operation", "libuv-worker-pool");
  trace.recordSnapshot("submit-file", sourceLine("readFile"), "Hand the file read to libuv", "The worker pool performs native file operations. The JavaScript callback is stored for later; it does not run on a worker thread.");
  trace.returnFromCall("read-file", "fs.readFile()", sourceLine("readFile"));
  trace.returnFromCall("listen-callback", "server.listen callback", sourceLine("endListeningCallback"));
};
