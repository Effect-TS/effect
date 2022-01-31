import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import type { PredState } from "./_internal/callbacks"
import { everyCb, foldlCb } from "./_internal/callbacks"

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given list.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List every
 */
export function every_<A>(self: List<A>, f: Predicate<A>): boolean {
  return foldlCb<A, PredState>(everyCb, { predicate: f, result: true }, self).result
}

/**
 * Returns `true` if and only if the predicate function returns `true`
 * for all elements in the given list.
 *
 * @complexity O(n)
 * @ets_data_first every_
 */
export function every<A>(f: Predicate<A>) {
  return (self: List<A>): boolean => self.every(f)
}
