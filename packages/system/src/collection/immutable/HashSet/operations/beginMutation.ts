import type { HashSet } from "../definition"
import { HashSetInternal, realHashSet } from "./_internal/hashSet"

/**
 * Marks the `HashSet` as mutable.
 *
 * @tsplus fluent ets/HashSet beginMutation
 */
export function beginMutation<A>(self: HashSet<A>): HashSet<A> {
  realHashSet(self)
  return new HashSetInternal(self._keyMap.beginMutation())
}
