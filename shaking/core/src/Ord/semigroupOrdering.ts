import type { Ordering } from "fp-ts/lib/Ordering"

import type { Semigroup } from "../Semigroup"

/**
 * Use `monoidOrdering` instead
 */
export const semigroupOrdering: Semigroup<Ordering> = {
  concat: (x, y) => (x !== 0 ? x : y)
}
