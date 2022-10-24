import * as Equal from "@fp-ts/data/Equal"

/**
 * Determine if the array contains a specified value.
 *
 * @tsplus static effect/core/stm/TArray.Aspects contains
 * @tsplus pipeable effect/core/stm/TArray contains
 * @category elements
 * @since 1.0.0
 */
export function contains<A>(value: A) {
  return (self: TArray<A>): STM<never, never, boolean> => self.exists((_) => Equal.equals(_, value))
}
