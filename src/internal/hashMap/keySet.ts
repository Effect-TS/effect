import type { HashMap } from "../../exports/HashMap.js"
import type { HashSet } from "../../exports/HashSet.js"
import { makeImpl } from "../hashSet.js"

/** @internal */
export function keySet<K, V>(self: HashMap<K, V>): HashSet<K> {
  return makeImpl(self)
}
