import * as Either from "@fp-ts/data/Either"

/**
 * Maps the error value of this effect to a left value.
 *
 * @tsplus getter effect/core/io/Effect asLeftError
 * @category mapping
 * @since 1.0.0
 */
export function asLeftError<R, E, A>(self: Effect<R, E, A>): Effect<R, Either.Either<E, never>, A> {
  return self.mapError(Either.left)
}
