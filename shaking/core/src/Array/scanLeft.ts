import { scanLeft as scanLeft_1 } from "../Readonly/Array/scanLeft"

/**
 * Same as `reduce` but it carries over the intermediate steps
 *
 * ```ts
 * import { scanLeft } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(scanLeft(10, (b, a: number) => b - a)([1, 2, 3]), [10, 9, 7, 4])
 * ```
 *
 * @since 2.0.0
 */
export const scanLeft: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (as: Array<A>) => Array<B> = scanLeft_1 as any
