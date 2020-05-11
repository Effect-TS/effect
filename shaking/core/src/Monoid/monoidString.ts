import { semigroupString } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export const monoidString: Monoid<string> = {
  concat: semigroupString.concat,
  empty: ""
}
