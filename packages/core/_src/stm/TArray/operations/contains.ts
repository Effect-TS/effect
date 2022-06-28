/**
 * Determine if the array contains a specified value.
 *
 * @tsplus static effect/core/stm/TArray.Aspects contains
 * @tsplus pipeable effect/core/stm/TArray contains
 */
export function contains<A>(equal: Equivalence<A>, value: A) {
  return (self: TArray<A>): STM<never, never, boolean> =>
    self.exists(
      (_) => equal.equals(_, value)
    )
}
