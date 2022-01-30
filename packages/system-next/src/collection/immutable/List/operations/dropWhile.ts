import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import { findNotIndexCb, foldlCb } from "./_internal/callbacks"

/**
 * Removes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @ets fluent ets/List dropWhile
 */
export function dropWhile_<A>(self: List<A>, f: Predicate<A>): List<A> {
  const { index } = foldlCb(findNotIndexCb, { predicate: f, index: 0 }, self)
  return self.slice(index, self.length)
}

/**
 * Removes the first elements in the list for which the predicate returns
 * `true`.
 *
 * @complexity `O(k + log(n))` where `k` is the number of elements
 * satisfying the predicate.
 * @ets_data_first dropWhile_
 */
export function dropWhile<A>(f: Predicate<A>) {
  return (self: List<A>): List<A> => self.dropWhile(f)
}
