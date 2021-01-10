// copyright https://github.com/frptools

import { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { commit, modify } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { setKeyValue } from "../Primitives"

/**
 * Sets an entry into the map
 */
export function set_<K, V>(map: HashMap<K, V>, key: K, value: V): HashMap<K, V> {
  const nextMap = modify(map)
  const change = ChangeFlag.get()
  setKeyValue(key, value, change, nextMap)
  return change.release(commit(nextMap), map)
}

/**
 * Sets an entry into the map
 */
export function set<K, V>(key: K, value: V) {
  return (map: HashMap<K, V>) => set_(map, key, value)
}
