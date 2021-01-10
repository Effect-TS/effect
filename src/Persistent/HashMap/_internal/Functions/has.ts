// copyright https://github.com/frptools

import { hash } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { NOTHING } from "../Nodes"
import { getHash } from "../Primitives"

/**
 * Checks if the map has a value for the key
 */
export function has_<K, V>(map: HashMap<K, V>, key: K): boolean {
  const hash_ = hash(key)
  return getHash(NOTHING, hash_, key, map) !== NOTHING
}

/**
 * Checks if the map has a value for the key
 */
export function has<K>(key: K) {
  return <V>(map: HashMap<K, V>) => has_(map, key)
}
