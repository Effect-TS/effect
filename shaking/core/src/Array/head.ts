import type { Option } from "../Option/Option"
import { head as head_1 } from "../Readonly/Array/head"

/**
 * Get the first element in an array, or `None` if the array is empty
 *
 * @example
 * import { head } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(head([1, 2, 3]), some(1))
 * assert.deepStrictEqual(head([]), none)
 */
export const head: <A>(as: Array<A>) => Option<A> = head_1
