import type { List } from "../definition"
import { containsCb, containsState, foldlCb } from "./_internal/callbacks"

/**
 * Returns `true` if the list contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 * @ets fluent ets/List contains
 */
export function contains_<A>(self: List<A>, element: A): boolean {
  containsState.element = element
  containsState.result = false
  return foldlCb(containsCb, containsState, self).result
}

/**
 * Returns `true` if the list contains the specified element.
 * Otherwise it returns `false`.
 *
 * @complexity O(n)
 * @ets_data_first contains_
 */
export function contains<A>(element: A) {
  return (self: List<A>): boolean => self.contains(element)
}
