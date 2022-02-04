import type { Option } from "../../../../data/Option"
import * as St from "../../../../prelude/Structural"
import type { HashMap } from "../definition"

/**
 * Safely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @tsplus fluent ets/HashMap get
 * @tsplus index ets/HashMap
 */
export function get_<K, V>(self: HashMap<K, V>, key: K): Option<V> {
  return self.getHash(key, St.hash(key))
}

/**
 * Safely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @ets_data_first get_
 */
export function get<K>(key: K) {
  return <V>(self: HashMap<K, V>): Option<V> => self.get(key)
}
