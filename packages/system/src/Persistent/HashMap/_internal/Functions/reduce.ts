// copyright https://github.com/frptools

import type { KeyedReduceFn } from "../../../_internal/Types"
import type { HashMap } from "../HashMap"
import { fold } from "../Primitives"

/**
 * Reduces with f over the entries
 */
export function reduce_<K, V, R>(
  map: HashMap<K, V>,
  seed: R,
  f: KeyedReduceFn<R, V, K>
): R {
  return fold(f, seed, map)
}

/**
 * Reduces with f over the entries
 */
export function reduce<K, V, R>(seed: R, f: KeyedReduceFn<R, V, K>) {
  return (map: HashMap<K, V>) => reduce_(map, seed, f)
}
