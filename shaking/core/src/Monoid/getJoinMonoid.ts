import type { Bounded } from "../Ord"
import { getJoinSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function getJoinMonoid<A>(B: Bounded<A>): Monoid<A> {
  return {
    concat: getJoinSemigroup(B).concat,
    empty: B.bottom
  }
}
