import { nodeSourceMapExtractor, runtimeDebug } from "@effect/core/io/Debug"
import * as path from "node:path"

const trace = nodeSourceMapExtractor(2)

if (trace) {
  const currentFile = trace.split(":")[0]!
  const currentDir = path.join(currentFile, "..")

  runtimeDebug.defaultSpanTracer = "cause"
  runtimeDebug.traceExecutionEnabled = true
  runtimeDebug.traceExecutionEnabledInCause = true
  runtimeDebug.traceSpanEnabledInCause = true
  runtimeDebug.traceStackEnabledInCause = true
  runtimeDebug.traceExecutionLogEnabled = true
  runtimeDebug.traceAlwaysViaExtractor = true
  runtimeDebug.traceEnabled = true
  runtimeDebug.logLevelOverride = LogLevel.Debug
  runtimeDebug.traceFilter = (traceToFilter) => traceToFilter.startsWith(currentDir)
  runtimeDebug.traceExtractor = nodeSourceMapExtractor
}

import("@effect/core/examples/tracing")
