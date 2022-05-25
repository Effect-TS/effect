import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink produced from an effect.
 *
 * @tsplus static ets/Sink/Ops unwrap
 */
export function unwrap<R, E, In, L, Z>(
  effect: LazyArg<Effect<R, E, Sink<R, E, In, L, Z>>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrap(
      effect().map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}
