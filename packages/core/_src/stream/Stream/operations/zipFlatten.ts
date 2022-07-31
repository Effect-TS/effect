import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipFlatten
 * @tsplus pipeable effect/core/stream/Stream zipFlatten
 */
export function zipFlatten<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipWith(that, (a, a2) => Tuple.mergeTuple(a, a2))
}
