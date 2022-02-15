import type { HashMap } from "../definition"
import { HashMapIterator, realHashMap } from "./_internal/hashMap"

/**
 * Returns an `IterableIterator` of the keys within the `HashMap`.
 *
 * @tsplus fluent ets/HashMap keys
 */
export function keys<K, V>(self: HashMap<K, V>): IterableIterator<K> {
  realHashMap(self)
  return new HashMapIterator(self, ([k]) => k)
}
