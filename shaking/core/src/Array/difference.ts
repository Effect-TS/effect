import type { Eq } from "../Eq"
import { difference as difference_1 } from "../Readonly/Array/difference"

/**
 * Creates an array of array values not included in the other given array using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { difference } from 'fp-ts/lib/Array'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)([1, 2], [2, 3]), [1])
 *
 * @since 2.0.0
 */
export const difference: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = difference_1 as any
