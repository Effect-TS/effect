import type { List } from "../definition"
import { elementEquals } from "./_internal/callbacks"

/**
 * Returns a list of lists where each sublist's elements are all
 * equal.
 *
 * @ets fluent ets/List group
 */
export function group<A>(self: List<A>): List<List<A>> {
  return self.groupWith(elementEquals)
}
