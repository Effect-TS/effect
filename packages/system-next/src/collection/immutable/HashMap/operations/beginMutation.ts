import type { HashMap } from "../definition"
import { HashMapInternal, realHashMap } from "./_internal/hashMap"

/**
 * Marks the `HashMap` as mutable.
 *
 * @tsplus fluent ets/HashMap beginMutation
 */
export function beginMutation<K, V>(self: HashMap<K, V>): HashMap<K, V> {
  realHashMap(self)
  return new HashMapInternal(true, self._edit + 1, self._root, self._size)
}
