import type { Eq } from "../../Eq"
import { isNone } from "../../Option"

import { lookupWithKey } from "./lookupWithKey"

/**
 * Insert or replace a key/value pair in a map
 *
 * @since 2.5.0
 */
export function insertAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(k, m)
    if (isNone(found)) {
      const r = new Map(m)
      r.set(k, a)
      return r
    } else if (found.value[1] !== a) {
      const r = new Map(m)
      r.set(found.value[0], a)
      return r
    }
    return m
  }
}
