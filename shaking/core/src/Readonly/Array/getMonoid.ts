import type { Monoid } from "../../Monoid"

import { concat } from "./concat"
import { empty } from "./empty"

/**
 * Returns a `Monoid` for `ReadonlyArray<A>`
 *
 * @example
 * import { getMonoid } from 'fp-ts/lib/ReadonlyArray'
 *
 * const M = getMonoid<number>()
 * assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
 *
 * @since 2.5.0
 */
export function getMonoid<A = never>(): Monoid<ReadonlyArray<A>> {
  return {
    concat,
    empty
  }
}
