import type { Eq } from "../../Eq"
import type { Monoid } from "../../Monoid"
import { isSome } from "../../Option"
import type { Semigroup } from "../../Semigroup"

import type { Next } from "./Next"
import { empty } from "./empty"
import { lookupWithKey } from "./lookupWithKey"

/**
 * Gets `Monoid` instance for Maps given `Semigroup` instance for their values
 *
 * @since 2.5.0
 */
export function getMonoid<K, A>(
  SK: Eq<K>,
  SA: Semigroup<A>
): Monoid<ReadonlyMap<K, A>> {
  const lookupWithKeyS = lookupWithKey(SK)
  return {
    concat: (mx, my) => {
      if (mx === empty) {
        return my
      }
      if (my === empty) {
        return mx
      }
      const r = new Map(mx)
      const entries = my.entries()
      let e: Next<readonly [K, A]>
      // tslint:disable-next-line: strict-boolean-expressions
      while (!(e = entries.next()).done) {
        const [k, a] = e.value
        const mxOptA = lookupWithKeyS(k, mx)
        if (isSome(mxOptA)) {
          r.set(mxOptA.value[0], SA.concat(mxOptA.value[1], a))
        } else {
          r.set(k, a)
        }
      }
      return r
    },
    empty
  }
}
