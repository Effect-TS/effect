// ets_tracing: off

import * as S from "../HashSet/index.js"
import type { HashMap } from "./index.js"

/**
 * Get the set of keys
 */
export function keySet<K, V>(self: HashMap<K, V>) {
  return new S.HashSet(self)
}
