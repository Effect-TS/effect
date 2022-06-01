import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Stream provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Stream<R, E, A>,
  env: LazyArg<Env<R>>,
  __tsplusTrace?: string
): Stream<never, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel.provideEnvironment(env))
}

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static ets/Stream/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_)
