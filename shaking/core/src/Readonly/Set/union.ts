import { Eq } from "../../Eq"

import { empty } from "./empty"
import { elem } from "./set"

/**
 * Form the union of two sets
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
