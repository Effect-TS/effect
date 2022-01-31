import type { Predicate } from "packages/system-next/src/data/Function"

import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `false`.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List filterNot
 */
export function filterNot_<A>(self: List<A>, f: Predicate<A>): List<A> {
  return self.reduce(MutableList.emptyPushable(), (acc, a) =>
    f(a) ? acc : acc.push(a)
  )
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `false`.
 *
 * @complexity O(n)
 * @ets_data_first filterNot_
 */
export function filterNot<A>(f: Predicate<A>) {
  return (self: List<A>): List<A> => self.filterNot(f)
}
