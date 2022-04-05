import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus fluent ets/Stream provideEnvironment
 */
export function provideEnvironment_<R, E, A>(
  self: Stream<R, E, A>,
  r: LazyArg<R>,
  __tsplusTrace?: string
): Stream<unknown, E, A> {
  concreteStream(self);
  return new StreamInternal(self.channel.provideEnvironment(r));
}

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 *
 * @tsplus static ets/Stream/Aspects provideEnvironment
 */
export const provideEnvironment = Pipeable(provideEnvironment_);
