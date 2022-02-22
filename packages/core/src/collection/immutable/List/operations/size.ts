import type { List } from "../definition"

/**
 * Gets the length of a list.
 *
 * @complexity `O(1)`
 * @tsplus getter ets/List size
 */
export function size(self: List<any>): number {
  return self.length
}
