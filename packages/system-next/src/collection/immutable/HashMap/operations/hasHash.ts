import type { HashMap } from "../definition"

/**
 * Checks if the specified key has an entry in the `HashMap` using a custom
 * hash.
 *
 * @tsplus fluent ets/HashMap hasHash
 */
export function hasHash_<K, V>(self: HashMap<K, V>, key: K, hash: number): boolean {
  return self.getHash(key, hash).isSome()
}

/**
 * Checks if the specified key has an entry in the `HashMap` using a custom
 * hash.
 *
 * @ets_data_first hasHash
 */
export function hashHash<K>(key: K, hash: number) {
  return <V>(self: HashMap<K, V>): boolean => self.hasHash(key, hash)
}
