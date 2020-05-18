import { Eq } from "../../Eq"

import { empty } from "./empty"
import { elem } from "./set"

/**
 * The set of elements which are in both the first and second set
 */
export function intersection<A>(
  E: Eq<A>
): (set: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => {
    if (x === empty || y === empty) {
      return empty
    }
    const r = new Set<A>()
    x.forEach((e) => {
      if (elemE(e, y)) {
        r.add(e)
      }
    })
    return r
  }
}
