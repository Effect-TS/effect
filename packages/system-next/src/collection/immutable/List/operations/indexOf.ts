import type { List } from "../definition"
import { foldlCb, indexOfCb } from "./_internal/callbacks"

/**
 * Returns the index of the _first_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @ets fluent ets/List indexOf
 */
export function indexOf_<A>(self: List<A>, element: A): number {
  const state = { element, found: false, index: -1 }
  foldlCb(indexOfCb, state, self)
  return state.found ? state.index : -1
}

/**
 * Returns the index of the _first_ element in the list that is equal
 * to the given element. If no such element is found `-1` is returned.
 *
 * @complexity O(n)
 * @ets_data_first indexOf_
 */
export function indexOf<A>(element: A) {
  return (self: List<A>): number => self.indexOf(element)
}
