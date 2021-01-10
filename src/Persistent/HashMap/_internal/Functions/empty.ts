// copyright https://github.com/frptools

import { isUndefined } from "../../../_internal/Guards"
import type { PreferredContext } from "../../../_internal/Structural"
import { immutable, withMutability } from "../../../_internal/Structural"
import { HashMap } from "../HashMap"
import { EMPTY } from "../Nodes"

let EMPTY_MAP: HashMap<any, any>

/**
 * Creates a new empty map
 */
export function empty<K, V>(pctx?: PreferredContext): HashMap<K, V> {
  if (isUndefined(EMPTY_MAP)) EMPTY_MAP = new HashMap<any, any>(immutable(), EMPTY, 0)
  return isUndefined(pctx) ? EMPTY_MAP : withMutability(pctx, EMPTY_MAP)
}
