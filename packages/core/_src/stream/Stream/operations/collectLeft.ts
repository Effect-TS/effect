/**
 * Filters any `Right` values.
 *
 * @tsplus getter effect/core/stream/Stream collectLeft
 */
export function collectLeft<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>,
  __tsplusTrace?: string
): Stream<R, E, L> {
  return self.collect((either) => either.isLeft() ? Maybe.some(either.left) : Maybe.none)
}
