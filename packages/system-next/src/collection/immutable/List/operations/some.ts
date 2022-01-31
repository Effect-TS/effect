import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import type { PredState } from "./_internal/callbacks"
import { foldlCb, someCb } from "./_internal/callbacks"

/**
 * Returns true if and only if there exists an element in the list for
 * which the predicate returns true.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List some
 */
export function some_<A>(self: List<A>, f: Predicate<A>): boolean {
  return foldlCb<A, PredState>(someCb, { predicate: f, result: false }, self).result
}

/**
 * Returns true if and only if there exists an element in the list for
 * which the predicate returns true.
 *
 * @complexity O(n)
 * @ets_data_first some_
 */
export function some<A>(f: Predicate<A>) {
  return (self: List<A>): boolean => self.some(f)
}
