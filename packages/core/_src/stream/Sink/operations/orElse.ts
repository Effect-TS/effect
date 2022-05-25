import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Returns a new sink that will perform the operations of this one, until
 * failure, and then it will switch over to the operations of the specified
 * fallback sink.
 *
 * @tsplus operator ets/Sink |
 * @tsplus fluent ets/Sink orElse
 */
export function orElse_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E1, In & In1, L, Z | Z1> {
  concreteSink(self)
  return new SinkInternal(
    self.channel.orElse(() => {
      const that0 = that()
      concreteSink(that0)
      return that0.channel
    })
  )
}

/**
 * Returns a new sink that will perform the operations of this one, until
 * failure, and then it will switch over to the operations of the specified
 * fallback sink.
 *
 * @tsplus static ets/Sink/Aspects orElse
 */
export const orElse = Pipeable(orElse_)
