/**
 * Zips this stream together with the index of elements.
 *
 * @tsplus getter effect/core/stream/Stream zipWithIndex
 */
export function zipWithIndex<R, E, A>(self: Stream<R, E, A>): Stream<R, E, Tuple<[A, number]>> {
  return self.mapAccum(0, (index, a) => Tuple(index + 1, Tuple(a, index)))
}
