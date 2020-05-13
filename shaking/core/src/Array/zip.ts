import { zip as zip_1 } from "../Readonly/Array/zip"

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * import { zip } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 *
 * @since 2.0.0
 */
export const zip: <A, B>(fa: Array<A>, fb: Array<B>) => Array<[A, B]> = zip_1 as any
