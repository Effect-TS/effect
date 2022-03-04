import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @tsplus fluent ets/TArray forAll
 */
export function forAll_<A>(self: TArray<A>, f: Predicate<A>): USTM<boolean> {
  return self.exists((a) => !f(a)).negate()
}

/**
 * Atomically evaluate the conjunction of a predicate across the members of
 * the array.
 *
 * @ets_data_first forAll_
 */
export function forAll<A>(f: Predicate<A>) {
  return (self: TArray<A>): USTM<boolean> => self.forAll(f)
}
