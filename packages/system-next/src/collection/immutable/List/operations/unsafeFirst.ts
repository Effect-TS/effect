import type { List } from "../definition"

/**
 * Returns the first element of the list. If the list is empty the
 * function returns undefined.
 *
 * @complexity O(1)
 * @tsplus fluent ets/List unsafeFirst
 */
export function unsafeFirst<A>(self: List<A>): A | undefined {
  return self.first.value
}
