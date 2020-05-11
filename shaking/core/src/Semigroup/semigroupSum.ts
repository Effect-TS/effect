import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Number `Semigroup` under addition
 * @since 2.0.0
 */
export const semigroupSum: Semigroup<number> = {
  concat: (x, y) => x + y
}
