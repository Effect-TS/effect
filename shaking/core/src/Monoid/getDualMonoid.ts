import { getDualSemigroup } from "../Semigroup"

import type { Monoid } from "./Monoid"

/**
 * The dual of a `Monoid`, obtained by swapping the arguments of `concat`.
 *
 * @example
 * import { getDualMonoid, monoidString } from 'fp-ts/lib/Monoid'
 *
 * assert.deepStrictEqual(getDualMonoid(monoidString).concat('a', 'b'), 'ba')
 *
 * @since 2.0.0
 */
export function getDualMonoid<A>(M: Monoid<A>): Monoid<A> {
  return {
    concat: getDualSemigroup(M).concat,
    empty: M.empty
  }
}
