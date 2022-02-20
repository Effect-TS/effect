import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import { findNotIndexCb, foldrCb } from "./_internal/callbacks"

/**
 * Takes the last elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @tsplus fluent ets/List takeLastWhile
 */
export function takeLastWhile_<A>(self: List<A>, f: Predicate<A>): List<A> {
  const { index } = foldrCb(findNotIndexCb, { predicate: f, index: 0 }, self)
  return self.slice(self.length - index, self.length)
}

/**
 * Takes the last elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @ets_data_first takeLastWhile_
 */
export function takeLastWhile<A>(f: Predicate<A>) {
  return (self: List<A>): List<A> => self.takeLastWhile(f)
}
