import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"

/**
 * Returns the number of entries within the `HashMap`.
 *
 * @tsplus getter ets/HashMap size
 */
export function size<K, V>(self: HashMap<K, V>): number {
  realHashMap(self)
  return self._size
}
