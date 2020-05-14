import type { Eq } from "../../Eq"

import { elem } from "./elem"
import { empty } from "./empty"

/**
 * The set of elements which are in both the first and second set
 *
 * @since 2.5.0
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
