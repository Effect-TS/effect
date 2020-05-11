import { semigroupAny } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * Boolean monoid under disjunction
 * @since 2.0.0
 */
export const monoidAny: Monoid<boolean> = {
  concat: semigroupAny.concat,
  empty: false
}
