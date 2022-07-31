/**
 * Submerges the error case of an `Either` into the `Stream`.
 *
 * @tsplus getter effect/core/stream/Stream absolve
 */
export function absolve<R, E, E2, A>(
  self: Stream<R, E, Either<E2, A>>
): Stream<R, E | E2, A> {
  return self.mapEffect((either) => Effect.fromEither(either))
}
