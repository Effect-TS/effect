/**
 * Returns a stream whose failure and success channels have been mapped by the
 * specified pair of functions, `f` and `g`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapBoth
 * @tsplus pipeable effect/core/stream/Stream mapBoth
 * @category mapping
 * @since 1.0.0
 */
export function mapBoth<E, E2, A, A2>(
  f: (e: E) => E2,
  g: (a: A) => A2
) {
  return <R>(self: Stream<R, E, A>): Stream<R, E2, A2> => self.mapError(f).map(g)
}
