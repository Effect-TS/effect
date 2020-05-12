/**
 * Same as `reduce` but it carries over the intermediate steps
 *
 * ```ts
 * import { scanLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(scanLeft(10, (b, a: number) => b - a)([1, 2, 3]), [10, 9, 7, 4])
 * ```
 *
 * @since 2.5.0
 */
export function scanLeft<A, B>(
  b: B,
  f: (b: B, a: A) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length
    // tslint:disable-next-line: readonly-array
    const r: Array<B> = new Array(l + 1)
    r[0] = b
    for (let i = 0; i < l; i++) {
      r[i + 1] = f(r[i], as[i])
    }
    return r
  }
}
