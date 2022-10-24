import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Context } from "@fp-ts/data/Context"

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideEnvironment
 * @tsplus pipeable effect/core/stream/Stream provideEnvironment
 * @category environment
 * @since 1.0.0
 */
export function provideEnvironment<R>(context: Context<R>) {
  return <E, A>(self: Stream<R, E, A>): Stream<never, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.provideEnvironment(context))
  }
}
