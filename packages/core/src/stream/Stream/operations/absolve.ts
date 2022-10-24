import type { Either } from "@fp-ts/data/Either"

/**
 * Submerges the error case of an `Either` into the `Stream`.
 *
 * @tsplus getter effect/core/stream/Stream absolve
 * @category mutations
 * @since 1.0.0
 */
export function absolve<R, E, E2, A>(
  self: Stream<R, E, Either<E2, A>>
): Stream<R, E | E2, A> {
  return self.mapEffect((either) => Effect.fromEither(either))
}
