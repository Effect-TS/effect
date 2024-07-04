/**
 * @since 0.24.0
 */
import * as monoid from "../Monoid.js"
import * as semigroup from "../Semigroup.js"

/**
 * `string` semigroup under concatenation.
 *
 * @category instances
 * @since 0.24.0
 */
export const Semigroup: semigroup.Semigroup<string> = semigroup.make((self, that) => self + that)

/**
 * `string` monoid under concatenation.
 *
 * The `empty` value is `''`.
 *
 * @category instances
 * @since 0.24.0
 */
export const Monoid: monoid.Monoid<string> = monoid.fromSemigroup(Semigroup, "")
