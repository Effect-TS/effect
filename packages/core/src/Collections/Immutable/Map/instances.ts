// ets_tracing: off

/* adapted from https://github.com/gcanti/fp-ts */

import * as M from "@effect-ts/system/Collections/Immutable/Map"
import type { Equal } from "@effect-ts/system/Equal"
import { makeEqual } from "@effect-ts/system/Equal"

import type { Associative } from "../../../Associative"
import type { Identity } from "../../../Identity/index.js"
import { makeIdentity } from "../../../Identity/index.js"
import * as Op from "../../../Option"

export function getIdentityEq<K, A>(
  eq: Equal<K>,
  associative: Associative<A>
): Identity<M.Map<K, A>> {
  return makeIdentity<M.Map<K, A>>(M.empty, (mx, my) => {
    if (M.isEmpty(mx)) return my

    if (M.isEmpty(my)) return mx

    const lookup = M.lookupWithKeyEq(eq)
    const r = new Map(mx)
    const entries = my.entries()

    let e: M.Next<readonly [K, A]>

    while (!(e = entries.next()).done) {
      const [k, a] = e.value
      const match = lookup(k)(mx)

      if (Op.isSome(match)) {
        r.set(match.value.get(0), associative.combine(match.value.get(1), a))
      } else {
        r.set(k, a)
      }
    }
    return r
  })
}

const eqInstance = <A>() => makeEqual<A>((x, y) => x == y)

export function getIdentity<K, A>(associative: Associative<A>): Identity<M.Map<K, A>> {
  return getIdentityEq(eqInstance<K>(), associative)
}
