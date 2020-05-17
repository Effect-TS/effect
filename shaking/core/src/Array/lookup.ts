import type { Option } from "../Option/Option"
import { lookup as lookup_1 } from "../Readonly/Array/lookup"

/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * @example
 * import { lookup } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(lookup(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(lookup(3, [1, 2, 3]), none)
 */
export const lookup: <A>(i: number, as: Array<A>) => Option<A> = lookup_1
