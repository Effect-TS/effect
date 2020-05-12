/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @example
 * import { makeBy } from 'fp-ts/lib/ReadonlyArray'
 *
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy(5, double), [0, 2, 4, 6, 8])
 *
 * @since 2.5.0
 */
export function makeBy<A>(n: number, f: (i: number) => A): ReadonlyArray<A> {
  // tslint:disable-next-line: readonly-array
  const r: Array<A> = []
  for (let i = 0; i < n; i++) {
    r.push(f(i))
  }
  return r
}
