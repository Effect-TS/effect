import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Checks if the specified value exists in the `HashSet`.
 *
 * @tsplus fluent ets/HashSet has
 */
export function has_<A>(self: HashSet<A>, value: A): boolean {
  realHashSet(self)
  return self._keyMap.has(value)
}

/**
 * Checks if the specified value exists in the `HashSet`.
 *
 * @ets_data_first has_
 */
export function has<A>(value: A) {
  return (self: HashSet<A>): boolean => self.has(value)
}
