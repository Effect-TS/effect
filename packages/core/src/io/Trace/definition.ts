import type { Chunk } from "../../collection/immutable/Chunk"
import type { FiberId } from "../FiberId"
import type { TraceElement } from "../TraceElement"

/**
 * @tsplus type ets/Trace
 * @tsplus companion ets/TraceOps
 */
export class Trace {
  constructor(readonly fiberId: FiberId, readonly stackTrace: Chunk<TraceElement>) {}
}

/**
 * @tsplus static ets/TraceOps __call
 */
export function make(fiberId: FiberId, stackTrace: Chunk<TraceElement>) {
  return new Trace(fiberId, stackTrace)
}
