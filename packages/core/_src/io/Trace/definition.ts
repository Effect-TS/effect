/**
 * @tsplus type effect/core/io/Trace
 * @tsplus companion effect/core/io/Trace.Ops
 */
export class Trace {
  constructor(readonly fiberId: FiberId, readonly stackTrace: Chunk<TraceElement>) {}
}

/**
 * @tsplus static effect/core/io/Trace.Ops __call
 */
export function make(fiberId: FiberId, stackTrace: Chunk<TraceElement>) {
  return new Trace(fiberId, stackTrace)
}
