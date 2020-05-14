import type { Eq } from "../../Eq"
import { isNone, none, Option, some } from "../../Option"

import { lookupWithKey } from "./lookupWithKey"

/**
 * @since 2.5.0
 */
export function modifyAt<K>(
  E: Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, f) => (m) => {
    const found = lookupWithKeyE(k, m)
    if (isNone(found)) {
      return none
    }
    const r = new Map(m)
    r.set(found.value[0], f(found.value[1]))
    return some(r)
  }
}
