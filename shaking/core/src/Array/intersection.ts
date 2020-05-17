import type { Eq } from "../Eq"
import { intersection as intersection_1 } from "../Readonly/Array/intersection"

/**
 * Creates an array of unique values that are included in all given arrays using a `Eq` for equality
 * comparisons. The order and references of result values are determined by the first array.
 *
 * @example
 * import { intersection } from 'fp-ts/lib/Array'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(intersection(eqNumber)([1, 2], [2, 3]), [2])
 */
export const intersection: <A>(
  E: Eq<A>
) => (xs: Array<A>, ys: Array<A>) => Array<A> = intersection_1 as any
