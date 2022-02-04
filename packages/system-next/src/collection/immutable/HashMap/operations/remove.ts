import { Option } from "../../../../data/Option"
import type { HashMap } from "../definition"

/**
 * Remove the entry for the specified key in the `HashMap` using the internal
 * hashing function.
 *
 * @tsplus fluent ets/HashMap remove
 */
export function remove_<K, V>(self: HashMap<K, V>, key: K) {
  return self.modify(key, () => Option.none)
}

/**
 * Remove the entry for the specified key in the `HashMap` using the internal
 * hashing function.
 *
 * @ets_data_first remove_
 */
export function remove<K>(key: K) {
  return <V>(self: HashMap<K, V>) => self.remove(key)
}
