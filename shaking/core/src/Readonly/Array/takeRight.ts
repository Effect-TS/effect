import { empty } from "./empty"

/**
 * Keep only a number of elements from the end of an array, creating a new array.
 * `n` must be a natural number
 *
 * @example
 * import { takeRight } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(takeRight(2)([1, 2, 3, 4, 5]), [4, 5])
 *
 * @since 2.5.0
 */
export function takeRight(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => (n === 0 ? empty : as.slice(-n))
}
