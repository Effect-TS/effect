import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Zips this stream with another point-wise, creating a new stream of pairs of
 * elements from both sides.
 *
 * The defaults `defaultLeft` and `defaultRight` will be used if the streams
 * have different lengths and one of the streams has ended before the other.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipAllFlatten
 * @tsplus pipeable effect/core/stream/Stream zipAllFlatten
 */
export function zipAllFlatten<R2, E2, A2, A>(
  that: LazyArg<Stream<R2, E2, A2>>,
  defaultLeft: LazyArg<A>,
  defaultRight: LazyArg<A2>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipAllWith(
      that,
      (a) => Tuple.mergeTuple(a, defaultRight()),
      (a2) => Tuple.mergeTuple(defaultLeft(), a2),
      (a, a2) => Tuple.mergeTuple(a, a2)
    )
}
