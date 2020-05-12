/**
 * The function is reverse of `zip`. Takes an array of pairs and return two corresponding arrays
 *
 * @example
 * import { unzip } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(unzip([[1, 'a'], [2, 'b'], [3, 'c']]), [[1, 2, 3], ['a', 'b', 'c']])
 *
 * @since 2.5.0
 */
export function unzip<A, B>(
  as: ReadonlyArray<readonly [A, B]>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  // tslint:disable-next-line: readonly-array
  const fa: Array<A> = []
  // tslint:disable-next-line: readonly-array
  const fb: Array<B> = []
  for (let i = 0; i < as.length; i++) {
    // eslint-disable-next-line prefer-destructuring
    fa[i] = as[i][0]
    // eslint-disable-next-line prefer-destructuring
    fb[i] = as[i][1]
  }
  return [fa, fb]
}
