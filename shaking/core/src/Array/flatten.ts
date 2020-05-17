import { flatten as flatten_1 } from "../Readonly/Array/flatten"

/**
 * Removes one level of nesting
 *
 * @example
 * import { flatten } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(flatten([[1], [2], [3]]), [1, 2, 3])
 */
export const flatten: <A>(mma: Array<Array<A>>) => Array<A> = flatten_1 as any
