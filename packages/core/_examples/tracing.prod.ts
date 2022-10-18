import { runtimeDebug } from "@effect/core/io/Debug"

runtimeDebug.traceEnabled = true
runtimeDebug.traceExecutionEnabled = true
runtimeDebug.traceExecutionEnabledInCause = true
runtimeDebug.traceSpanEnabledInCause = true
runtimeDebug.traceStackEnabledInCause = true
runtimeDebug.defaultSpanTracer = "cause"

import("@effect/core/examples/tracing")
