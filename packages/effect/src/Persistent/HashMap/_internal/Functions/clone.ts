// copyright https://github.com/frptools

import type { PreferredContext } from "../../../_internal/Structural"
import { selectContext } from "../../../_internal/Structural"
import { HashMap } from "../HashMap"

/**
 * Clones the HashMap
 */
export function clone<K, V>(
  map: HashMap<K, V>,
  pctx?: PreferredContext
): HashMap<K, V> {
  return new HashMap(selectContext(pctx), map._root, map._size)
}
