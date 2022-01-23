import type { Chunk } from "../../collection/immutable/Chunk/core"
import type { TraceElement } from "../../io/TraceElement"
import type { FiberId } from "../FiberId"
import type { FiberRef } from "../FiberRef"
import type { LogLevel } from "../LogLevel"
import type { LogSpan } from "../LogSpan"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export interface Logger<Message, Output> {
  (
    trace: TraceElement,
    fiberId: FiberId,
    logLevel: LogLevel,
    message: () => Message,
    context: ReadonlyMap<FiberRef.Runtime<any>, any>,
    spans: Chunk<LogSpan>,
    location: TraceElement
  ): Output
}
