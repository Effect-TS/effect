import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * @since 2.0.0
 */
export function fold<A>(S: Semigroup<A>): (a: A, as: ReadonlyArray<A>) => A {
  return (a, as) => as.reduce(S.concat, a)
}
