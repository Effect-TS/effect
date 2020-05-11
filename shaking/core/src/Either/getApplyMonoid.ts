import type { Monoid } from "../Monoid"

import type { Either } from "./Either"
import { getApplySemigroup } from "./getApplySemigroup"
import { right } from "./right"

/**
 * @since 2.0.0
 */
export function getApplyMonoid<E, A>(M: Monoid<A>): Monoid<Either<E, A>> {
  return {
    ...getApplySemigroup(M),
    empty: right(M.empty)
  }
}
