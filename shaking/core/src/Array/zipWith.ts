import { zipWith as zipWith_1 } from "../Readonly/Array/zipWith"

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * import { zipWith } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 *
 * @since 2.0.0
 */
export const zipWith: <A, B, C>(
  fa: Array<A>,
  fb: Array<B>,
  f: (a: A, b: B) => C
) => Array<C> = zipWith_1 as any
