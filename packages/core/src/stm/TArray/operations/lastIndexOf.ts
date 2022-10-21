/**
 * Get the first index of a specific value in the arrayor -1 if it does not
 * occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects lastIndexOf
 * @tsplus pipeable effect/core/stm/TArray lastIndexOf
 */
export function lastIndexOf<A>(equivalence: Equivalence<A>, value: A) {
  return (self: TArray<A>): STM<never, never, number> =>
    self.lastIndexOfFrom(equivalence, value, self.length - 1)
}
