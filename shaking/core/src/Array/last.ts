import type { Option } from "../Option/Option"
import { last as last_1 } from "../Readonly/Array/last"

/**
 * Get the last element in an array, or `None` if the array is empty
 *
 * @example
 * import { last } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 */
export const last: <A>(as: Array<A>) => Option<A> = last_1
