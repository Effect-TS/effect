/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexOfFrom
 * @tsplus pipeable effect/core/stm/TArray indexOfFrom
 */
export function indexOfFrom_<A>(equivalence: Equivalence<A>, value: A, from: number) {
  return (self: TArray<A>): STM<never, never, number> =>
    self.indexWhereFrom(
      (_) => equivalence.equals(_, value),
      from
    )
}
