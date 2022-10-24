import * as Either from "@fp-ts/data/Either"

/**
 * Converts the failure channel into an `Either`.
 *
 * @tsplus getter effect/core/stm/STM either
 * @category getters
 * @since 1.0.0
 */
export function either<R, E, A>(self: STM<R, E, A>): STM<R, never, Either.Either<E, A>> {
  return self.fold(Either.left, Either.right)
}
