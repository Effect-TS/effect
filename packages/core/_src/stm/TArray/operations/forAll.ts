/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @tsplus static effect/core/stm/TArray.Aspects forAll
 * @tsplus pipeable effect/core/stm/TArray forAll
 */
export function forAll<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, boolean> =>
    self.exists(
      (a) => !f(a)
    ).negate
}
