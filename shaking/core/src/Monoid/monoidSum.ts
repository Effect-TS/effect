import { semigroupSum } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * Number monoid under addition
 * @since 2.0.0
 */
export const monoidSum: Monoid<number> = {
  concat: semigroupSum.concat,
  empty: 0
}
