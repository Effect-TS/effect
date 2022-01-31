import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import { findNotIndexCb, foldlCb } from "./_internal/callbacks"

/**
 * Takes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 * @tsplus fluent ets/List takeWhile
 */
export function takeWhile_<A>(self: List<A>, f: Predicate<A>): List<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate: f, index: 0 }, self)
  return self.slice(0, index)
}

/**
 * Takes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements satisfying
 * the predicate.
 * @ets_data_first takeWhile_
 */
export function takeWhile<A>(f: Predicate<A>) {
  return (self: List<A>): List<A> => self.takeWhile(f)
}
