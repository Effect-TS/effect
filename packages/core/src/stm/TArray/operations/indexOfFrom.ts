import * as Equal from "@fp-ts/data/Equal"

/**
 * Get the first index of a specific value in the array, starting at a
 * specific index, or -1 if it does not occur.
 *
 * @tsplus static effect/core/stm/TArray.Aspects indexOfFrom
 * @tsplus pipeable effect/core/stm/TArray indexOfFrom
 * @category elements
 * @since 1.0.0
 */
export function indexOfFrom_<A>(value: A, from: number) {
  return (self: TArray<A>): STM<never, never, number> =>
    self.indexWhereFrom((_) => Equal.equals(_, value), from)
}
