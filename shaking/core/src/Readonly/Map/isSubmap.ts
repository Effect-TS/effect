import type { Eq } from "../../Eq"
import { isNone } from "../../Option"

import type { Next } from "./Next"
import { lookupWithKey } from "./lookupWithKey"

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 *
 * @since 2.5.0
 */
export function isSubmap<K, A>(
  SK: Eq<K>,
  SA: Eq<A>
): (d1: ReadonlyMap<K, A>, d2: ReadonlyMap<K, A>) => boolean {
  const lookupWithKeyS = lookupWithKey(SK)
  return (d1: ReadonlyMap<K, A>, d2: ReadonlyMap<K, A>): boolean => {
    const entries = d1.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const d2OptA = lookupWithKeyS(k, d2)
      if (
        isNone(d2OptA) ||
        !SK.equals(k, d2OptA.value[0]) ||
        !SA.equals(a, d2OptA.value[1])
      ) {
        return false
      }
    }
    return true
  }
}
