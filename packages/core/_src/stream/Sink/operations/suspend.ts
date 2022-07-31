import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Returns a lazily constructed sink that may require effects for its
 * creation.
 *
 * @tsplus static effect/core/stream/Sink.Ops suspend
 */
export function suspend<R, E, In, L, Z>(
  sink: LazyArg<Sink<R, E, In, L, Z>>
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.suspend(() => {
      const sink0 = sink()
      concreteSink(sink0)
      return sink0.channel
    })
  )
}
