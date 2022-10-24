/**
 * Zips this stream together with the index of elements.
 *
 * @tsplus getter effect/core/stream/Stream zipWithIndex
 * @category zipping
 * @since 1.0.0
 */
export function zipWithIndex<R, E, A>(self: Stream<R, E, A>): Stream<R, E, readonly [A, number]> {
  return self.mapAccum(0, (index, a) => [index + 1, [a, index] as const] as const)
}
