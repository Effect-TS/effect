// copyright https://github.com/frptools

import { hash } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { getHash } from "../Primitives"

/**
 * Get the element at key K if it exists else return undefined
 */
export function get_<K, V>(map: HashMap<K, V>, key: K): V | undefined {
  const hash_ = hash(key)
  return getHash(void 0, hash_, key, map)
}

/**
 * Get the element at key K if it exists else return undefined
 */
export function get<K>(key: K) {
  return <V>(map: HashMap<K, V>) => get_(map, key)
}
