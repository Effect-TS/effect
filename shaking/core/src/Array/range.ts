import { range as range_1 } from "../Readonly/Array/range"

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @example
 * import { range } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 *
 * @since 2.0.0
 */
export const range: (start: number, end: number) => Array<number> = range_1 as any
