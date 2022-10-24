import * as Either from "@fp-ts/data/Either"

/**
 * Maps the success value of this effect to a left value.
 *
 * @tsplus getter effect/core/io/Effect asLeft
 * @category mapping
 * @since 1.0.0
 */
export function asLeft<R, E, A>(self: Effect<R, E, A>): Effect<R, E, Either.Either<A, never>> {
  return self.map(Either.left)
}
