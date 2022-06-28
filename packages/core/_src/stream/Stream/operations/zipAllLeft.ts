/**
 * Zips this stream with another point-wise, and keeps only elements from this
 * stream.
 *
 * The provided default value will be used if the other stream ends before
 * this one.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipAllLeft
 * @tsplus pipeable effect/core/stream/Stream zipAllLeft
 */
export function zipAllLeft<A, R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  def: LazyArg<A>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.zipAllWith(
      that,
      identity,
      def,
      (a, _) => a
    )
}
