import type { List } from "../definition"

/**
 * Returns `true` if the given list is empty and `false` otherwise.
 *
 * @ets fluent ets/List isEmpty
 */
export function isEmpty(self: List<any>): boolean {
  return self.length === 0
}
