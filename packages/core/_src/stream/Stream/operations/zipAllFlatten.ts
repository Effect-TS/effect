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
export function zipAllFlatten<R2, E2, A2, A extends ReadonlyArray<any>>(
  that: Stream<R2, E2, A2>,
  defaultLeft: A,
  defaultRight: A2
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, readonly [...A, A2]> =>
    self.zipAllWith(
      that,
      (a) => [...a, defaultRight],
      (a2) => [...defaultLeft, a2],
      (a, a2) => [...a, a2]
    )
}
