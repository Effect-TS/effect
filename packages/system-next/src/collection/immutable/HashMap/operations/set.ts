import { Option } from "../../../../data/Option"
import type { HashMap } from "../definition"

/**
 * Sets the specified key to the specified value using the internal hashing
 * function.
 *
 * @tsplus fluent ets/HashMap set
 */
export function set_<K, V>(self: HashMap<K, V>, key: K, value: V): HashMap<K, V> {
  return self.modify(key, () => Option.some(value))
}

/**
 * Sets the specified key to the specified value using the internal hashing
 * function.
 *
 * @ets_data_first set_
 */
export function set<K, V>(key: K, value: V) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.set(key, value)
}
