import type { List } from "../definition"
import { foldrCb, indexOfCb } from "./_internal/callbacks"

/**
 * Returns the index of the _last_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @ets fluent ets/List lastIndexOf
 */
export function lastIndexOf_<A>(self: List<A>, element: A): number {
  const state = { element, found: false, index: 0 }
  foldrCb(indexOfCb, state, self)
  return state.found ? self.length - state.index : -1
}

/**
 * Returns the index of the _last_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @ets_data_first lastIndexOf_
 */
export function lastIndexOf<A>(element: A) {
  return (self: List<A>): number => self.lastIndexOf(element)
}
