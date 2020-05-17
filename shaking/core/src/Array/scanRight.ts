import { scanRight as scanRight_1 } from "../Readonly/Array/scanRight"

/**
 * Fold an array from the right, keeping all intermediate results instead of only the final result
 *
 * @example
 * import { scanRight } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(scanRight(10, (a: number, b) => b - a)([1, 2, 3]), [4, 5, 7, 10])
 */
export const scanRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (as: Array<A>) => Array<B> = scanRight_1 as any
