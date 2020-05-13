import { takeRight as takeRight_1 } from "../Readonly/Array/takeRight"

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeRight } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 *
 * @since 2.0.0
 */
export const takeRight: (
  n: number
) => <A>(as: Array<A>) => Array<A> = takeRight_1 as any
