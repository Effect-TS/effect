/**
 * @tsplus type ets/Trace
 * @tsplus companion ets/Trace/Ops
 */
export class Trace {
  constructor(readonly fiberId: FiberId, readonly stackTrace: Chunk<TraceElement>) {}
}

/**
 * @tsplus static ets/Trace/Ops __call
 */
export function make(fiberId: FiberId, stackTrace: Chunk<TraceElement>) {
  return new Trace(fiberId, stackTrace);
}
