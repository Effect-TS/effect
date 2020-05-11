import type { Bounded } from "../Ord"
import { getMeetSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export function getMeetMonoid<A>(B: Bounded<A>): Monoid<A> {
  return {
    concat: getMeetSemigroup(B).concat,
    empty: B.top
  }
}
