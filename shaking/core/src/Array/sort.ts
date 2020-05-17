import type { Ord } from "../Ord"
import { sort as sort_1 } from "../Readonly/Array/sort"

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @example
 * import { sort } from 'fp-ts/lib/Array'
 * import { ordNumber } from 'fp-ts/lib/Ord'
 *
 * assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
 */
export const sort: <A>(O: Ord<A>) => (as: Array<A>) => Array<A> = sort_1 as any
