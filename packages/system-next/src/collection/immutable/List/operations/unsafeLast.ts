import type { List } from "../definition"

/**
 * Returns the last element of the list. If the list is empty the
 * function returns `undefined`.
 *
 * @complexity O(1)
 * @tsplus fluent ets/List unsafeLast
 */
export function unsafeLast<A>(self: List<A>): A | undefined {
  return self.last.value
}
