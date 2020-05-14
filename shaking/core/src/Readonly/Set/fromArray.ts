import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * Create a set from an array
 *
 * @since 2.5.0
 */

export function fromArray<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlySet<A> {
  return (as) => {
    const len = as.length
    const r = new Set<A>()
    const has = elem(E)
    for (let i = 0; i < len; i++) {
      const a = as[i]
      if (!has(a, r)) {
        r.add(a)
      }
    }
    return r
  }
}
