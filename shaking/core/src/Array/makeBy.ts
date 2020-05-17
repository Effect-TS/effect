import { makeBy as makeBy_1 } from "../Readonly/Array/makeBy"

/**
 * Return a list of length `n` with element `i` initialized with `f(i)`
 *
 * @example
 * import { makeBy } from 'fp-ts/lib/Array'
 *
 * const double = (n: number): number => n * 2
 * assert.deepStrictEqual(makeBy(5, double), [0, 2, 4, 6, 8])
 */
export const makeBy: <A>(n: number, f: (i: number) => A) => Array<A> = makeBy_1 as any
