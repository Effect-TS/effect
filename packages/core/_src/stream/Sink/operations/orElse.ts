import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Returns a new sink that will perform the operations of this one, until
 * failure, and then it will switch over to the operations of the specified
 * fallback sink.
 *
 * @tsplus pipeable-operator effect/core/stream/Sink |
 * @tsplus static effect/core/stream/Sink.Aspects orElse
 * @tsplus pipeable effect/core/stream/Sink orElse
 */
export function orElse<R1, E1, In, In1 extends In, L, L1 extends L, Z1>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
) {
  return <R, E, Z>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E1, In & In1, L, Z | Z1> => {
    concreteSink(self)
    return new SinkInternal(
      self.channel.orElse(() => {
        const that0 = that()
        concreteSink(that0)
        return that0.channel
      })
    )
  }
}
