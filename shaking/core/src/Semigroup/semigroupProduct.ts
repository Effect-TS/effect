import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * Number `Semigroup` under multiplication
 * @since 2.0.0
 */
export const semigroupProduct: Semigroup<number> = {
  concat: (x, y) => x * y
}
