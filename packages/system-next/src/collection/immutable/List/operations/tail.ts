import type { List } from "../definition"

/**
 * Returns a new list with the first element removed. If the list is
 * empty the empty list is returned.
 *
 * @complexity `O(1)`
 * @tsplus fluent ets/List tail
 */
export function tail<A>(self: List<A>): List<A> {
  return self.slice(1, self.length)
}
