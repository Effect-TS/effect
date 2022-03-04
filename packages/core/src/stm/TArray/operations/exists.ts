import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @tsplus fluent ets/TArray exists
 */
export function exists_<A>(self: TArray<A>, f: Predicate<A>): USTM<boolean> {
  return self.find(f).map((option) => option.isSome())
}

/**
 * Determine if the array contains a value satisfying a predicate.
 *
 * @ets_data_first exists_
 */
export function exists<A>(f: Predicate<A>) {
  return (self: TArray<A>): USTM<boolean> => self.exists(f)
}
