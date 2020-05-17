import type { Eq } from "../Eq"
import { union as union_1 } from "../Readonly/Array/union"

/**
 * Creates an array of unique values, in order, from all given arrays using a `Eq` for equality comparisons
 *
 * @example
 * import { union } from 'fp-ts/lib/Array'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
 */
export const union: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = union_1 as any
