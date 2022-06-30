import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Performs a filter and map in a single step.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collect
 * @tsplus pipeable effect/core/stream/Stream collect
 */
export function collect<A, B>(pf: (a: A) => Maybe<B>, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, B> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut((chunk) => chunk.collect(pf)))
  }
}
