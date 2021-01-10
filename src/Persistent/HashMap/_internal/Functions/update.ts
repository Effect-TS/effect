// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import { get_, remove_, set_ } from "./index"

export type UpdateEntryCallback<K, V> = (
  value: V | undefined,
  map: HashMap<K, V>
) => V | undefined

/**
 * Updates the value at key
 */
export function update_<K, V>(
  map: HashMap<K, V>,
  key: K,
  callback: UpdateEntryCallback<K, V>
): HashMap<K, V> {
  const oldv = get_(map, key)
  const newv = callback(oldv, map)
  return newv === oldv
    ? map
    : newv === void 0
    ? remove_(map, key)
    : set_(map, key, newv)
}

/**
 * Updates the value at key
 */
export function update<K, V>(key: K, callback: UpdateEntryCallback<K, V>) {
  return (map: HashMap<K, V>) => update_(map, key, callback)
}
