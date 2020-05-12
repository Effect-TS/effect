import { zipWith } from "./zipWith"

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * import { zip } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(zip([1, 2, 3], ['a', 'b', 'c', 'd']), [[1, 'a'], [2, 'b'], [3, 'c']])
 *
 * @since 2.5.0
 */
export function zip<A, B>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>
): ReadonlyArray<readonly [A, B]> {
  return zipWith(fa, fb, (a, b) => [a, b])
}
