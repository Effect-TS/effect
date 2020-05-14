import type { Eq } from "../../Eq"
import { isNone, none, Option, some } from "../../Option"

import { lookupWithKey } from "./lookupWithKey"

/**
 * @since 2.5.0
 */
export function updateAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, a) => (m) => {
    const found = lookupWithKeyE(k, m)
    if (isNone(found)) {
      return none
    }
    const r = new Map(m)
    r.set(found.value[0], a)
    return some(r)
  }
}
