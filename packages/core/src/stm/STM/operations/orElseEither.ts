import * as Either from "@fp-ts/data/Either"

/**
 * Returns a transactional effect that will produce the value of this effect
 * in left side, unless it fails or retries, in which case, it will produce
 * the value of the specified effect in right side.
 *
 * @tsplus static effect/core/stm/STM.Aspects orElseEither
 * @tsplus pipeable effect/core/stm/STM orElseEither
 * @category alternatives
 * @since 1.0.0
 */
export function orElseEither<R1, E1, B>(that: LazyArg<STM<R1, E1, B>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R | R1, E | E1, Either.Either<A, B>> =>
    self.map(Either.left) | that().map(Either.right)
}
