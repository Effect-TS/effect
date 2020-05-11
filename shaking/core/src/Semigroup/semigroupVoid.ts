import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * @since 2.0.0
 */
export const semigroupVoid: Semigroup<void> = {
  concat: () => undefined
}
