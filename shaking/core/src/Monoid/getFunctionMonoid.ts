import { getFunctionSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function getFunctionMonoid<M>(
  M: Monoid<M>
): <A = never>() => Monoid<(a: A) => M> {
  return () => ({
    concat: getFunctionSemigroup(M)<any>().concat,
    empty: () => M.empty
  })
}
