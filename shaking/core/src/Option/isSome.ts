import type { Option, Some } from "fp-ts/lib/Option"

/**
 * Returns `true` if the option is an instance of `Some`, `false` otherwise
 *
 * @example
 * import { some, none, isSome } from 'fp-ts/lib/Option'
 *
 * assert.strictEqual(isSome(some(1)), true)
 * assert.strictEqual(isSome(none), false)
 *
 * @since 2.0.0
 */
export function isSome<A>(fa: Option<A>): fa is Some<A> {
  return fa._tag === "Some"
}
