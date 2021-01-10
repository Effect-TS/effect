// copyright https://github.com/frptools

import { commit, modify } from "../../../_internal/Structural"
import type { KeyedMapFn } from "../../../_internal/Types"
import type { HashMap } from "../HashMap"
import { reduce_ } from "./reduce"
import { set_ } from "./set"

/**
 * Apply f to each entry performing a mapping operation
 */
export function map_<K, V, R>(map: HashMap<K, V>, f: (value: V) => R): HashMap<K, R>
export function map_<K, V, R>(map: HashMap<K, V>, f: KeyedMapFn<V, K, R>): HashMap<K, R>
export function map_<K, V, R>(
  map: HashMap<K, V>,
  f: KeyedMapFn<V, K, R>
): HashMap<K, R> {
  const nextMap = <HashMap<K, R>>(<any>modify(map))
  reduce_(
    map,
    nextMap,
    function (newMap: HashMap<K, R>, value: V, key: K, index: number) {
      return set_(newMap, key, f(value, key, index))
    }
  )
  return commit(nextMap)
}

/**
 * Apply f to each entry performing a mapping operation
 */
export function map<V, R>(f: (value: V) => R): <K>(map: HashMap<K, V>) => HashMap<K, R>
export function map<K, V, R>(
  f: KeyedMapFn<V, K, R>
): (map: HashMap<K, V>) => HashMap<K, R>
export function map<K, V, R>(
  f: KeyedMapFn<V, K, R>
): (map: HashMap<K, V>) => HashMap<K, R> {
  return (map) => map_(map, f)
}
