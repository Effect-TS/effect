/**
 * Returns a new stream that only emits elements that are not equal to the
 * previous element emitted, using strict equality to determine whether two
 * elements are equal.
 *
 * @tsplus getter effect/core/stream/Stream changes
 * @category mutations
 * @since 1.0.0
 */
export function changes<R, E, A>(
  self: Stream<R, E, A>
): Stream<R, E, A> {
  return self.changesWith((x, y) => x === y)
}
