import { unzip as unzip_1 } from "../Readonly/Array/unzip"

/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * import { unzip } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 *
 * @since 2.0.0
 */
export const unzip: <A, B>(as: Array<[A, B]>) => [Array<A>, Array<B>] = unzip_1 as any
