/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * import { zipWith } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 *
 * @since 2.5.0
 */
export function zipWith<A, B, C>(
  fa: ReadonlyArray<A>,
  fb: ReadonlyArray<B>,
  f: (a: A, b: B) => C
): ReadonlyArray<C> {
  // tslint:disable-next-line: readonly-array
  const fc: Array<C> = []
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i])
  }
  return fc
}
