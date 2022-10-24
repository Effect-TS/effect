import * as Either from "@fp-ts/data/Either"

/**
 * Maps the error value of this effect to a right value.
 *
 * @tsplus getter effect/core/io/Effect asRightError
 * @category mapping
 * @since 1.0.0
 */
export function asRightError<R, E, A>(
  self: Effect<R, E, A>
): Effect<R, Either.Either<never, E>, A> {
  return self.mapError(Either.right)
}
