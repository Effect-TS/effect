import * as Either from "@fp-ts/data/Either"
/**
 * Maps the success value of this effect to a right value.
 *
 * @tsplus getter effect/core/io/Effect asRight
 * @category mapping
 * @since 1.0.0
 */
export function asRight<R, E, A>(self: Effect<R, E, A>): Effect<R, E, Either.Either<never, A>> {
  return self.map(Either.right)
}
