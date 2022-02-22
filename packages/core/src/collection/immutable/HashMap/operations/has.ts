import * as St from "../../../../prelude/Structural"
import type { HashMap } from "../definition"

/**
 * Checks if the specified key has an entry in the `HashMap`.
 *
 * @tsplus fluent ets/HashMap has
 */
export function has_<K, V>(self: HashMap<K, V>, key: K): boolean {
  return self.getHash(key, St.hash(key)).isSome()
}

/**
 * Checks if the specified key has an entry in the `HashMap`.
 *
 * @ets_data_first has_
 */
export function has<K>(key: K) {
  return <V>(self: HashMap<K, V>): boolean => self.has(key)
}
