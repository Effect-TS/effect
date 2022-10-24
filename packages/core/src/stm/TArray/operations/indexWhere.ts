import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexWhere
 * @tsplus pipeable effect/core/stm/TArray indexWhere
 * @category elements
 * @since 1.0.0
 */
export function indexWhere<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, number> => self.indexWhereFrom(f, 0)
}
