import type { HashMap } from "../../HashMap.js"
import type { HashSet } from "../../HashSet.js"
import { makeImpl } from "../HashSet.js"

/** @internal */
export function keySet<K, V>(self: HashMap<K, V>): HashSet<K> {
  return makeImpl(self)
}
