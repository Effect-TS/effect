import type { Monoid } from "../Monoid"
import { getMonoid as getMonoid_1 } from "../Readonly/Array/getMonoid"

/**
 * Returns a `Monoid` for `Array<A>`
 *
 * @example
 * import { getMonoid } from 'fp-ts/lib/Array'
 *
 * const M = getMonoid<number>()
 * assert.deepStrictEqual(M.concat([1, 2], [3, 4]), [1, 2, 3, 4])
 */
export const getMonoid: <A = never>() => Monoid<Array<A>> = getMonoid_1 as any
