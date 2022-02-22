import type { HashMap } from "../definition"
import { HashMapIterator, realHashMap } from "./_internal/hashMap"

/**
 * Returns an `IterableIterator` of the values within the `HashMap`.
 *
 * @tsplus fluent ets/HashMap values
 */
export function values<K, V>(self: HashMap<K, V>): IterableIterator<V> {
  realHashMap(self)
  return new HashMapIterator(self, ([, v]) => v)
}
