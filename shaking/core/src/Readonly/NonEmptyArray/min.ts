import type { Ord } from "../../Ord"
import { getMeetSemigroup } from "../../Semigroup"

import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * @since 2.5.0
 */
export function min<A>(ord: Ord<A>): (nea: ReadonlyNonEmptyArray<A>) => A {
  const S = getMeetSemigroup(ord)
  return (nea) => nea.reduce(S.concat)
}
