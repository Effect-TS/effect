// copyright https://github.com/frptools

import { commit, modify } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"

export type UpdateMapCallback<K, V> = (map: HashMap<K, V>) => HashMap<K, V> | void

/**
 * Performs a set of mutations over the map
 */
export function updateMap_<K, V>(
  map: HashMap<K, V>,
  callback: UpdateMapCallback<K, V>
): HashMap<K, V> {
  let nextMap = modify(map)
  const oldRoot = nextMap._root
  nextMap = <HashMap<K, V>>callback(nextMap) || nextMap
  return commit(nextMap)._root === oldRoot ? map : nextMap
}

/**
 * Performs a set of mutations over the map
 */
export function updateMap<K, V>(callback: UpdateMapCallback<K, V>) {
  return (map: HashMap<K, V>) => updateMap_(map, callback)
}
