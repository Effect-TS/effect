/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhere
 * @tsplus pipeable effect/core/stm/TArray indexWhere
 */
export function indexWhere<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, number> => self.indexWhereFrom(f, 0)
}
