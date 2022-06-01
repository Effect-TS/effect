import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus fluent ets/Stream zipFlatten
 */
export function zipFlatten_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWith(that, (a, a2) => Tuple.mergeTuple(a, a2))
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static ets/Stream/Aspects zipFlatten
 */
export const zipFlatten = Pipeable(zipFlatten_)
