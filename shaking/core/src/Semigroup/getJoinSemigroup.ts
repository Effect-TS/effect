import type { Semigroup } from "fp-ts/lib/Semigroup"

import { max, Ord } from "../Ord"

/**
 * @since 2.0.0
 */
export function getJoinSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return {
    concat: max(O)
  }
}
