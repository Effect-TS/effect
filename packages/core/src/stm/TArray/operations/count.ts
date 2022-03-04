import type { Predicate } from "../../../data/Function"
import type { USTM } from "../../STM"
import type { TArray } from "../definition"

/**
 * Count the values in the array matching a predicate.
 *
 * @tsplus fluent ets/TArray count
 */
export function count_<A>(self: TArray<A>, f: Predicate<A>): USTM<number> {
  return self.reduce(0, (n, a) => (f(a) ? n + 1 : n))
}

/**
 * Count the values in the array matching a predicate.
 *
 * @ets_data_first count_
 */
export function count<A>(f: Predicate<A>) {
  return (self: TArray<A>): USTM<number> => self.count(f)
}
