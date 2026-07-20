import type { SimulationSnapshot } from "../../domain/simulation/types";
import { createTraceBuilder } from "../shared/createTraceBuilder";
import { traceServerStartup } from "./traceServerStartup";
import { traceFileRequest } from "./traceFileRequest";
import { traceHttpResponse } from "./traceHttpResponse";
import { traceServerShutdown } from "./traceServerShutdown";

// A teaching trace: native and library internals are grouped into application stages.
export const createLibuvTrace = (): readonly SimulationSnapshot[] => {
  const trace = createTraceBuilder();
  traceServerStartup(trace);
  traceFileRequest(trace);
  traceHttpResponse(trace);
  traceServerShutdown(trace);
  return trace.build();
};
