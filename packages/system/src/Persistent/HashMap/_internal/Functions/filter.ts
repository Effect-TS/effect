// copyright https://github.com/frptools

import { commit, modify } from "../../../_internal/Structural"
import type { KeyedFilterFn } from "../../../_internal/Types"
import type { HashMap } from "../HashMap"
import { fold } from "../Primitives"
import { remove_ } from "./remove"

/**
 * Filters over the map entries
 */
export function filter_<K, V>(
  map: HashMap<K, V>,
  fn: KeyedFilterFn<V, K>
): HashMap<K, V> {
  map = modify(map)
  fold(
    function (map: HashMap<K, V>, value: V, key: K, index: number) {
      return fn(value, key, index) ? map : remove_(map, key)
    },
    map,
    map,
    true
  )
  return commit(map)
}

/**
 * Filters over the map entries
 */
export function filter<K, V>(
  fn: KeyedFilterFn<V, K>
): (map: HashMap<K, V>) => HashMap<K, V> {
  return (map) => filter_(map, fn)
}
