import type { Predicate } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { List } from "../definition"
import type { PredState } from "./_internal/callbacks"
import { findCb, foldlCb } from "./_internal/callbacks"

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets fluent ets/List find
 */
export function find_<A>(self: List<A>, f: Predicate<A>): Option<A> {
  return foldlCb<A, PredState>(findCb, { predicate: f, result: Option.none }, self)
    .result
}

/**
 * Returns the _first_ element for which the predicate returns `true`.
 * If no such element is found the function returns `undefined`.
 *
 * @complexity O(n)
 * @ets_data_first find_
 */
export function find<A>(f: Predicate<A>) {
  return (self: List<A>): Option<A> => self.find(f)
}
