import * as Option from "@fp-ts/data/Option"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @tsplus static effect/core/stm/TArray.Aspects exists
 * @tsplus pipeable effect/core/stm/TArray exists
 * @category elements
 * @since 1.0.0
 */
export function exists<A>(f: Predicate<A>) {
  return (self: TArray<A>): STM<never, never, boolean> => self.find(f).map(Option.isSome)
}
