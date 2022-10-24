/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zip
 * @tsplus pipeable effect/core/stream/Stream zip
 * @category zipping
 * @since 1.0.0
 */
export function zip<R2, E2, A2>(that: Stream<R2, E2, A2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, readonly [A, A2]> =>
    self.zipWith(that, (a, a2) => [a, a2])
}
