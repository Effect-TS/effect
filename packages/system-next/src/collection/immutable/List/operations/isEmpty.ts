import type { List } from "../definition"

/**
 * Returns `true` if the given list is empty and `false` otherwise.
 *
 * @tsplus fluent ets/List isEmpty
 */
export function isEmpty(self: List<any>): boolean {
  return self.length === 0
}
