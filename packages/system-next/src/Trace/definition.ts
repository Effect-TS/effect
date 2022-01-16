// ets_tracing: off

import type { Chunk } from "../Collections/Immutable/Chunk"
import type { FiberId } from "../FiberId"
import type { TraceElement } from "../TraceElement"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export class Trace {
  constructor(readonly fiberId: FiberId, readonly stackTrace: Chunk<TraceElement>) {}
}
