import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Boolean semigroup under disjunction
 * @since 2.0.0
 */
export const semigroupAny: Semigroup<boolean> = {
  concat: (x, y) => x || y
}
