import type * as Either from "@fp-ts/data/Either"
/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 *
 * @tsplus static effect/core/stm/STM.Ops absolve
 * @tsplus getter effect/core/stm/STM absolve
 * @category mutations
 * @since 1.0.0
 */
export function absolve<R, E, E1, A>(
  self: STM<R, E, Either.Either<E1, A>>
): STM<R, E | E1, A> {
  return self.flatMap(STM.fromEither)
}
