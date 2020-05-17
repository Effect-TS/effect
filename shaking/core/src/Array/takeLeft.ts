import { takeLeft as takeLeft_1 } from "../Readonly/Array/takeLeft"

/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeLeft } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
 */
export const takeLeft: (n: number) => <A>(as: Array<A>) => Array<A> = takeLeft_1 as any
