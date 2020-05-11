import type { Semigroup } from "fp-ts/lib/Semigroup"

/**
 * @since 2.0.0
 */
export function getFunctionSemigroup<S>(
  S: Semigroup<S>
): <A = never>() => Semigroup<(a: A) => S> {
  return () => ({
    concat: (f, g) => (a) => S.concat(f(a), g(a))
  })
}
