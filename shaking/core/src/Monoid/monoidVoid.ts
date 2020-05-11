import { semigroupVoid } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * @since 2.0.0
 */
export const monoidVoid: Monoid<void> = {
  concat: semigroupVoid.concat,
  empty: undefined
}
