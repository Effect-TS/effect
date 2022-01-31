import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List unsafeFindLast
 */
export function unsafeFindLast_<A>(self: List<A>, f: Predicate<A>): A | undefined {
  return self.findLast(f).value
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets_data_first unsafeFindLast_
 */
export function unsafeFindLast<A>(f: Predicate<A>) {
  return (self: List<A>): A | undefined => self.unsafeFindLast(f)
}
