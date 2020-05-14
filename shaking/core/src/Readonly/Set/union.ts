import type { Eq } from "../../Eq"

import { elem } from "./elem"
import { empty } from "./empty"

/**
 * Form the union of two sets
 *
 * @since 2.5.0
 */

export function union<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const r = new Set(x)
    y.forEach((e) => {
      if (!elemE(e, r)) {
        r.add(e)
      }
    })
    return r
  }
}
