/**
 * Filters any `Left` values.
 *
 * @tsplus getter effect/core/stream/Stream collectRight
 */
export function collectRight<R, E, L, A>(
  self: Stream<R, E, Either<L, A>>
): Stream<R, E, A> {
  return self.collect((either) => either.isRight() ? Maybe.some(either.right) : Maybe.none)
}
