import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Context } from "@fp-ts/data/Context"

/**
 * Accesses the environment of the sink in the context of a sink.
 *
 * @tsplus static effect/core/stream/Sink.Ops environmentWithSink
 * @category environment
 * @since 1.0.0
 */
export function environmentWithSink<R0, R, E, In, L, Z>(
  f: (context: Context<R0>) => Sink<R, E, In, L, Z>
): Sink<R0 | R, E, In, L, Z> {
  return new SinkInternal(
    Channel.unwrap(
      Effect.environmentWith((r: Context<R0>) => {
        const sink = f(r)
        concreteSink(sink)
        return sink.channel
      })
    )
  )
}
