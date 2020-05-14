import type { Eq } from "../../Eq"
import type { Option } from "../../Option"

import { elem } from "./elem"

/**
 * @since 2.5.0
 */

export function filterMap<B>(
  E: Eq<B>
): <A>(f: (a: A) => Option<B>) => (fa: ReadonlySet<A>) => ReadonlySet<B> {
  const elemE = elem(E)
  return (f) => (fa) => {
    const r: Set<B> = new Set()
    fa.forEach((a) => {
      const ob = f(a)
      if (ob._tag === "Some" && !elemE(ob.value, r)) {
        r.add(ob.value)
      }
    })
    return r
  }
}
