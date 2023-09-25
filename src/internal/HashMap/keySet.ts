import type { HashMap } from "../../HashMap"
import type { HashSet } from "../../HashSet"
import { makeImpl } from "../../internal/HashSet"

/** @internal */
export function keySet<K, V>(self: HashMap<K, V>): HashSet<K> {
  return makeImpl(self)
}
