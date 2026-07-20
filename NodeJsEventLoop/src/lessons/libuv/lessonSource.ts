const statements = {
  importFileSystem: "const fs = require('node:fs');",
  importHttp: "const http = require('node:http');",
  importAxios: "const axios = require('axios');",
  createServer: "const server = http.createServer((_request, response) => {",
  logServerRequest: "  console.log('server request');",
  scheduleServerNextTick: "  process.nextTick(() => console.log('server nextTick'));",
  scheduleServerPromise: "  Promise.resolve().then(() => console.log('server promise'));",
  sendResponse: "  response.end(JSON.stringify({ user: 'Ada' }));",
  endRequestHandler: "});",
  listen: "server.listen(0, () => {",
  logListening: "  console.log('server listening');",
  readFile: "  fs.readFile(__filename, () => {",
  logFileReady: "    console.log('file ready');",
  scheduleFileNextTick: "    process.nextTick(() => console.log('file nextTick'));",
  scheduleFilePromise: "    Promise.resolve().then(() => console.log('file promise'));",
  scheduleImmediate: "    setImmediate(() => console.log('file immediate'));",
  scheduleTimer: "    setTimeout(() => console.log('file timer'), 0);",
  readPort: "    const { port } = server.address();",
  defineRequestUser: "    const requestUser = async () => {",
  awaitAxios: "      const { data } = await axios.get(`http://127.0.0.1:${port}/users`);",
  logAxiosResult: "      console.log(`axios ready: ${data.user}`);",
  closeServer: "      server.close(() => console.log('server closed'));",
  endRequestUser: "    };",
  callRequestUser: "    void requestUser();",
  endFileCallback: "  });",
  endListeningCallback: "});",
  logMainEnd: "console.log('main end');",
} as const;

export const libuvSourceCode: readonly string[] = Object.values(statements);

export const sourceLine = (statement: keyof typeof statements): number =>
  Object.keys(statements).indexOf(statement) + 1;
