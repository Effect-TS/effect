import { semigroupAll } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * Boolean monoid under conjunction
 * @since 2.0.0
 */
export const monoidAll: Monoid<boolean> = {
  concat: semigroupAll.concat,
  empty: true
}
