import type { List } from "../definition"
import { elementEquals } from "./_internal/callbacks"

/**
 * Returns true if the two lists are equivalent.
 *
 * @complexity O(n)
 * @tsplus fluent ets/List equals
 */
export function equals_<A>(self: List<A>, that: List<A>): boolean {
  return self.equalsWith(that, elementEquals)
}

/**
 * Returns true if the two lists are equivalent.
 *
 * @complexity O(n)
 * @ets_data_first equals_
 */
export function equals<A>(that: List<A>) {
  return (self: List<A>): boolean => self.equals(that)
}
