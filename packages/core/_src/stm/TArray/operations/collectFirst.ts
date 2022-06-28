/**
 * Finds the result of applying a partial function to the first value in its
 * domain.
 *
 * @tsplus static effect/core/stm/TArray.Aspects collectFirst
 * @tsplus pipeable effect/core/stm/TArray collectFirst
 */
export function collectFirst<A, B>(pf: (a: A) => Maybe<B>) {
  return (self: TArray<A>): STM<never, never, Maybe<B>> =>
    self.find((a) => pf(a).isSome()).map((option) => option.flatMap(pf))
}
