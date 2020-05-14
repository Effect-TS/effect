import type { Eq } from "../../Eq"
import { isSome } from "../../Option"

import { lookupWithKey } from "./lookupWithKey"

/**
 * Delete a key and value from a map
 *
 * @since 2.5.0
 */
export function deleteAt<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k) => (m) => {
    const found = lookupWithKeyE(k, m)
    if (isSome(found)) {
      const r = new Map(m)
      r.delete(found.value[0])
      return r
    }
    return m
  }
}
