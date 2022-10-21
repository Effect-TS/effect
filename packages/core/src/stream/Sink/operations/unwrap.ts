import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink produced from an effect.
 *
 * @tsplus static effect/core/stream/Sink.Ops unwrap
 */
export function unwrap<R, E, In, L, Z>(
  effect: Effect<R, E, Sink<R, E, In, L, Z>>
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrap(
      effect.map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}
