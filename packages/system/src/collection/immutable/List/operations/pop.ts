import type { List } from "../definition"

/**
 * Returns a new list with the last element removed. If the list is
 * empty the empty list is returned.
 *
 * @complexity `O(1)`
 * @tsplus fluent ets/List pop
 */
export function pop<A>(self: List<A>): List<A> {
  return self.slice(0, -1)
}
