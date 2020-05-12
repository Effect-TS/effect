/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 *
 * @example
 * import { scanRight } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 *
 * @since 2.5.0
 */
export function scanRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length
    // tslint:disable-next-line: readonly-array
    const r: Array<B> = new Array(l + 1)
    r[l] = b
    for (let i = l - 1; i >= 0; i--) {
      r[i] = f(as[i], r[i + 1])
    }
    return r
  }
}
