import type { HashMap } from "effect/HashMap"
import type { HashSet } from "effect/HashSet"
import { makeImpl } from "effect/internal/HashSet"

/** @internal */
export function keySet<K, V>(self: HashMap<K, V>): HashSet<K> {
  return makeImpl(self)
}
