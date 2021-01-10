// copyright https://github.com/frptools

import type { KeyedForEachFn } from "../../../_internal/Types"
import type { HashMap } from "../HashMap"
import { fold } from "../Primitives"

/**
 * Applies f for each entry in the map
 */
export function forEach_<K, V>(
  map: HashMap<K, V>,
  f: KeyedForEachFn<V, K>
): HashMap<K, V> {
  fold(
    (_, value, key, index) => f(value, key, index),
    <any>null,
    <HashMap<K, V>>map,
    true
  )
  return map
}

/**
 * Applies f for each entry in the map
 */
export function forEach<K, V>(f: KeyedForEachFn<V, K>) {
  return (map: HashMap<K, V>) => forEach_(map, f)
}
