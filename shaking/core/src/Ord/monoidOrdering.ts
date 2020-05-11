import { Monoid } from "../Monoid"

import { Ordering } from "./Ordering"
import { semigroupOrdering } from "./semigroupOrdering"

/**
 * @since 2.4.0
 */
export const monoidOrdering: Monoid<Ordering> = {
  // tslint:disable-next-line: deprecation
  concat: semigroupOrdering.concat,
  empty: 0
}
