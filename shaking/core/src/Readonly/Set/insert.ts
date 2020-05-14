import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * Insert a value into a set
 *
 * @since 2.5.0
 */

export function insert<A>(E: Eq<A>): (a: A) => (set: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (a) => (set) => {
    if (!elemE(a, set)) {
      const r = new Set(set)
      r.add(a)
      return r
    } else {
      return set
    }
  }
}
