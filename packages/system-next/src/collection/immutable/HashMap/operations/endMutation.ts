import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"

/**
 * Marks the `HashMap` as immutable.
 *
 * @tsplus fluent ets/HashMap endMutation
 */
export function endMutation<K, V>(self: HashMap<K, V>): HashMap<K, V> {
  realHashMap(self)
  self._editable = false
  return self
}
