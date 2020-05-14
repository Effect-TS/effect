import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * @since 2.5.0
 */

export function chain<B>(
  E: Eq<B>
): <A>(f: (x: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(e, r)) {
          r.add(e)
        }
      })
    })
    return r
  }
}
