import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Stream provideEnvironment
 */
export function provideEnvironment<R>(env: Env<R>) {
  return <E, A>(self: Stream<R, E, A>): Stream<never, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.provideEnvironment(env))
  }
}
