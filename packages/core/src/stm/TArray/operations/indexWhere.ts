import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray indexWhere
 */
export function indexWhere_<A>(self: TArray<A>, f: Predicate<A>): USTM<number> {
  return self.indexWhereFrom(f, 0)
}

/**
 * Get the index of the first entry in the array matching a predicate.
 *
 * @ets_data_first indexWhere_
 */
export function indexWhere<A>(f: Predicate<A>) {
  return (self: TArray<A>): USTM<number> => self.indexWhere(f)
}
