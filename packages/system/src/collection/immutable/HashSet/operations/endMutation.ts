import { realHashMap } from "../../HashMap/operations/_internal/hashMap"
import type { HashSet } from "../definition"
import { realHashSet } from "./_internal/hashSet"

/**
 * Marks the `HashSet` as immutable.
 *
 * @tsplus fluent ets/HashSet endMutation
 */
export function endMutation<A>(self: HashSet<A>): HashSet<A> {
  realHashSet(self)
  realHashMap(self._keyMap)
  self._keyMap._editable = false
  return self
}
