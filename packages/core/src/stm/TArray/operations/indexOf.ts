/**
 * Get the first index of a specific value in the array or -1 if it does not
 * occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexOf
 * @tsplus pipeable effect/core/stm/TArray indexOf
 */
export function indexOf<A>(equivalence: Equivalence<A>, value: A) {
  return (self: TArray<A>): STM<never, never, number> => self.indexOfFrom(equivalence, value, 0)
}
