import type { Semigroup } from "fp-ts/lib/Semigroup"

import { min, Ord } from "../Ord"

/**
 * @since 2.0.0
 */
export function getMeetSemigroup<A>(O: Ord<A>): Semigroup<A> {
  return {
    concat: min(O)
  }
}
