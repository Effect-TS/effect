// copyright https://github.com/frptools

import { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { commit, modify } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { NOTHING } from "../Nodes"
import { setKeyValue } from "../Primitives"

/**
 * Removes an entry from the map
 */
export function remove_<K, V>(map: HashMap<K, V>, key: K): HashMap<K, V> {
  const nextMap = modify(map)
  const change = ChangeFlag.get()
  setKeyValue<K, V>(key, NOTHING as V, change, nextMap)
  return change.release(commit(nextMap), map)
}

/**
 * Removes an entry from the map
 */
export function remove<K>(key: K) {
  return <V>(map: HashMap<K, V>) => remove_(map, key)
}
