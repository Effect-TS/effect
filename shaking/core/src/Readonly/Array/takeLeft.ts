/**
 * Keep only a number of elements from the start of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(takeLeft(2)([1, 2, 3]), [1, 2])
 *
 * @since 2.5.0
 */
export function takeLeft(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(0, n)
}
