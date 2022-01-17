import type { Chunk } from "../Collections/Immutable/Chunk"
import type { FiberId } from "../FiberId"
import type { FiberRef } from "../FiberRef"
import type { LogLevel } from "../LogLevel"
import type { LogSpan } from "../LogSpan"
import type { TraceElement } from "../TraceElement"

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
