import {
  concreteSink,
  SinkInternal
} from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * Provides the sink with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Sink provideEnvironment
 */
export function provideEnvironment<R>(env: Env<R>) {
  return <E, In, L, Z>(self: Sink<R, E, In, L, Z>): Sink<never, E, In, L, Z> => {
    concreteSink(self)
    return new SinkInternal(self.channel.provideEnvironment(env))
  }
}
