import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets fluent ets/List unsafeFind
 */
export function unsafeFind_<A>(self: List<A>, f: Predicate<A>): A | undefined {
  return self.find(f).value
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets_data_first unsafeFind_
 */
export function unsafeFind<A>(f: Predicate<A>) {
  return (self: List<A>): A | undefined => self.unsafeFind(f)
}
