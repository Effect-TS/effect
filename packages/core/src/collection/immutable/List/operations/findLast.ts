import type { Predicate } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { List } from "../definition"
import type { PredState } from "./_internal/callbacks"
import { findCb, foldrCb } from "./_internal/callbacks"

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List findLast
 */
export function findLast_<A>(self: List<A>, f: Predicate<A>): Option<A> {
  return foldrCb<A, PredState>(findCb, { predicate: f, result: Option.none }, self)
    .result
}

/**
 * Returns the _last_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets_data_first findLast_
 */
export function findLast<A>(f: Predicate<A>) {
  return (self: List<A>): Option<A> => self.findLast(f)
}
