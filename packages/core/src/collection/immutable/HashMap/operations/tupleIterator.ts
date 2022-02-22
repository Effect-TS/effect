import type { Tuple } from "../../Tuple"
import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"

/**
 * Returns an `Iterable` of key/value pairs contained in the `HashMap` wrapped
 * in a `Tuple`.
 *
 * @tsplus fluent ets/HashMap tupleIterator
 */
export function tupleIterator<K, V>(self: HashMap<K, V>): Iterable<Tuple<[K, V]>> {
  realHashMap(self)
  return self._tupleIterator
}
