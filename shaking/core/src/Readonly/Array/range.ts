import { makeBy } from "./makeBy"

/**
 * Create an array containing a range of integers, including both endpoints
 *
 * @example
 * import { range } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(range(1, 5), [1, 2, 3, 4, 5])
 *
 * @since 2.5.0
 */
export function range(start: number, end: number): ReadonlyArray<number> {
  return makeBy(end - start + 1, (i) => start + i)
}
