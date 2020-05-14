import type { Eq } from "../../Eq"

import { elem } from "./elem"
/**
 * Projects a Set through a function
 *
 * @since 2.5.0
 */

export function map<B>(
  E: Eq<B>
): <A>(f: (x: A) => B) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (set) => {
    const r = new Set<B>()
    set.forEach((e) => {
      const v = f(e)
      if (!elemE(v, r)) {
        r.add(v)
      }
    })
    return r
  }
}
