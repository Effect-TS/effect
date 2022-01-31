import type { List } from "../definition"
import { elementEquals } from "./_internal/callbacks"

/**
 * Returns a new list without repeated elements.
 *
 * @complexity `O(n)`
 * @ets fluent ets/List dropRepeats
 */
export function dropRepeats<A>(self: List<A>): List<A> {
  return self.dropRepeatsWith(elementEquals)
}
