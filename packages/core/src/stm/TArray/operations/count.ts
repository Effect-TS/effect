import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Count the values in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects count
 * @tsplus pipeable effect/core/stm/TArray count
 * @category elements
 * @since 1.0.0
 */
export function count<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, number> =>
    self.reduce(
      0,
      (n, a) => (f(a) ? n + 1 : n)
    )
}
