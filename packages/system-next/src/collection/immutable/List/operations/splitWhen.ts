import type { Predicate } from "../../../../data/Function"
import { Tuple } from "../../Tuple"
import { List } from "../definition"

/**
 * Splits a list at the first element in the list for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 * @tsplus fluent ets/List splitWhen
 */
export function splitWhen_<A>(
  self: List<A>,
  f: Predicate<A>
): Tuple<[List<A>, List<A>]> {
  const idx = self.findIndex(f)
  return idx === -1 ? Tuple(self, List.empty()) : self.splitAt(idx)
}

/**
 * Splits a list at the first element in the list for which the given
 * predicate returns `true`.
 *
 * @complexity `O(n)`
 * @ets_data_first splitWhen_
 */
export function splitWhen<A>(f: Predicate<A>) {
  return (self: List<A>): Tuple<[List<A>, List<A>]> => self.splitWhen(f)
}
