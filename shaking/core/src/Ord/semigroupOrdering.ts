import { Semigroup } from "../Semigroup"

import { Ordering } from "./Ordering"

/**
 * Use `monoidOrdering` instead
 * @since 2.0.0
 * @deprecated
 */
export const semigroupOrdering: Semigroup<Ordering> = {
  concat: (x, y) => (x !== 0 ? x : y)
}
