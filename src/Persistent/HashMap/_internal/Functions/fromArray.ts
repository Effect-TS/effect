// copyright https://github.com/frptools

import { ChangeFlag } from "../../../_internal/Core/ChangeFlag"
import { commit } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import { setKeyValue } from "../Primitives"
import { empty } from "./empty"

/**
 * Converts an array of key-value to a map
 */
export function fromArray<K, V>(array: readonly (readonly [K, V])[]): HashMap<K, V> {
  let map = <HashMap<K, V>>empty<K, V>(true)
  const change = ChangeFlag.get()
  for (let i = 0; i < array.length; ++i) {
    const entry = array[i]
    setKeyValue(entry[0], entry[1], change, map)
    change.reset()
  }
  map = commit(map)
  return map
}
