import * as Option from "@fp-ts/data/Option"

/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @tsplus static effect/core/stm/TArray.Aspects collectFirst
 * @tsplus pipeable effect/core/stm/TArray collectFirst
 * @category elements
 * @since 1.0.0
 */
export function collectFirst<A, B>(pf: (a: A) => Option.Option<B>) {
  return (self: TArray<A>): STM<never, never, Option.Option<B>> =>
    self.find((a) => Option.isSome(pf(a))).map(Option.flatMap(pf))
}
