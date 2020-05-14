import type { Monoid } from "../../Monoid"
import type { Ord } from "../../Ord"

import { toReadonlyArray } from "./toReadonlyArray"

/**
 * @since 2.5.0
 */
export function foldMap<A, M>(
  O: Ord<A>,
  M: Monoid<M>
): (f: (a: A) => M) => (fa: ReadonlySet<A>) => M {
  const toArrayO = toReadonlyArray(O)
  return (f) => (fa) => toArrayO(fa).reduce((b, a) => M.concat(b, f(a)), M.empty)
}
