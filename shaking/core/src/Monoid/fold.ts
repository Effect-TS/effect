import { fold as foldSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function fold<A>(M: Monoid<A>): (as: ReadonlyArray<A>) => A {
  const foldM = foldSemigroup(M)
  return (as) => foldM(M.empty, as)
}
