import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Performs a filter and map in a single step.
 *
 * @tsplus fluent ets/Stream collect
 */
export function collect_<R, E, A, B>(
  self: Stream<R, E, A>,
  pf: (a: A) => Maybe<B>,
  __tsplusTrace?: string
): Stream<R, E, B> {
  concreteStream(self)
  return new StreamInternal(self.channel.mapOut((chunk) => chunk.collect(pf)))
}

/**
 * Performs a filter and map in a single step.
 *
 * @tsplus static ets/Stream/Aspects collect
 */
export const collect = Pipeable(collect_)
