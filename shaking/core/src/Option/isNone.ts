import type { Option, None } from "fp-ts/lib/Option"

/**
 * Returns `true` if the option is `None`, `false` otherwise
 *
 * @example
 * import { some, none, isNone } from 'fp-ts/lib/Option'
 *
 * assert.strictEqual(isNone(some(1)), false)
 * assert.strictEqual(isNone(none), true)
 *
 * @since 2.0.0
 */
export function isNone<A>(fa: Option<A>): fa is None {
  return fa._tag === "None"
}
