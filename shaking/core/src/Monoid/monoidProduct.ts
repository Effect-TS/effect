import { semigroupProduct } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * Number monoid under multiplication
 * @since 2.0.0
 */
export const monoidProduct: Monoid<number> = {
  concat: semigroupProduct.concat,
  empty: 1
}
