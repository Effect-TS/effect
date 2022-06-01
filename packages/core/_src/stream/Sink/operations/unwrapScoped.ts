import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Creates a sink produced from a scoped effect.
 *
 * @tsplus static ets/Sink/Ops unwrapScoped
 */
export function unwrapScoped<R, E, In, L, Z>(
  effect: LazyArg<Effect<R | Scope, E, Sink<R, E, In, L, Z>>>,
  __tsplusTrace?: string
): Sink<R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrapScoped(
      effect().map((sink) => {
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}
