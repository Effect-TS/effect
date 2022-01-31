import type { Predicate } from "../../../../data/Function"
import type { List } from "../definition"
import type { FindIndexState } from "./_internal/callbacks"
import { findIndexCb, foldlCb } from "./_internal/callbacks"

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 * @ets fluent ets/List findIndex
 */
export function findIndex_<A>(self: List<A>, f: Predicate<A>): number {
  const { found, index } = foldlCb<A, FindIndexState>(
    findIndexCb,
    { predicate: f, found: false, index: -1 },
    self
  )
  return found ? index : -1
}

/**
 * Returns the index of the `first` element for which the predicate
 * returns true. If no such element is found the function returns
 * `-1`.
 *
 * @complexity O(n)
 * @ets_data_first findIndex_
 */
export function findIndex<A>(f: Predicate<A>) {
  return (self: List<A>): number => self.findIndex(f)
}
