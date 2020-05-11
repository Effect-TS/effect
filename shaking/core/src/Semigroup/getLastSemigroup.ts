import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * @since 2.0.0
 */
export function getLastSemigroup<A = never>(): Semigroup<A> {
  return { concat: (_, y) => y }
}
