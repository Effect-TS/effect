import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Boolean semigroup under conjunction
 * @since 2.0.0
 */
export const semigroupAll: Semigroup<boolean> = {
  concat: (x, y) => x && y
}
