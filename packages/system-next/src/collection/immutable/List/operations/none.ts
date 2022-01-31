import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given list.
 *
 * @complexity O(n)
 * @ets fluent ets/List none
 */
export function none_<A>(self: List<A>, f: Predicate<A>): boolean {
  return !self.some(f)
}

/**
 * Returns `true` if and only if the predicate function returns
 * `false` for every element in the given list.
 *
 * @complexity O(n)
 * @ets_data_first none_
 */
export function none<A>(f: Predicate<A>) {
  return (self: List<A>): boolean => self.none(f)
}
