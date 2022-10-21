/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects exists
 * @tsplus pipeable effect/core/stm/TArray exists
 */
export function exists<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, boolean> =>
    self
      .find(f)
      .map((option) => option.isSome())
}
