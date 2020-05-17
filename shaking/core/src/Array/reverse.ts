import { reverse as reverse_1 } from "../Readonly/Array/reverse"

/**
 * Reverse an array, creating a new array
 *
 * @example
 * import { reverse } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(reverse([1, 2, 3]), [3, 2, 1])
 */
export const reverse: <A>(as: Array<A>) => Array<A> = reverse_1 as any
