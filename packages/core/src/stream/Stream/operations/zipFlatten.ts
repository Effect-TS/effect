/**
 * Zips this stream with another point-wise and emits tuples of elements from
 * both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @tsplus static effect/core/stream/Stream.Aspects zipFlatten
 * @tsplus pipeable effect/core/stream/Stream zipFlatten
 * @category zipping
 * @since 1.0.0
 */
export function zipFlatten<R2, E2, A2>(that: Stream<R2, E2, A2>) {
  return <R, E, A extends ReadonlyArray<any>>(
    self: Stream<R, E, A>
  ): Stream<R | R2, E | E2, readonly [...A, A2]> => self.zipWith(that, (a, a2) => [...a, a2])
}
