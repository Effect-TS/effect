import { Eq } from "../../Eq"
import { none, Option, some } from "../../Option"

import { Next } from "./Next"
/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 *
 * @since 2.5.0
 */

export function lookupWithKey<K>(
  E: Eq<K>
): <A>(k: K, m: ReadonlyMap<K, A>) => Option<readonly [K, A]> {
  return <A>(k: K, m: ReadonlyMap<K, A>) => {
    const entries = m.entries()
    let e: Next<readonly [K, A]>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value
      if (E.equals(ka, k)) {
        return some([ka, a])
      }
    }
    return none
  }
}
