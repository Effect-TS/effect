import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

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
  concreteStream(self)
  return new StreamInternal(self.channel.provideEnvironment(r))
}

/**
 * Provides the stream with its required environment, which eliminates its
 * dependency on `R`.
 */
export const provideEnvironment = Pipeable(provideEnvironment_)
