import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Context } from "@fp-ts/data/Context"

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Sink provideEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideEnvironment<R>(context: Context<R>) {
  return <E, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<never, E, In, L, Z> => {
    concreteSink(self)
    return new SinkInternal(self.channel.provideEnvironment(context))
  }
}
