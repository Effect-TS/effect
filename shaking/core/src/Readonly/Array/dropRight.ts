/**
 * Drop a number of elements from the end of an array, creating a new array
 *
 * @example
 * import { dropRight } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(dropRight(2)([1, 2, 3, 4, 5]), [1, 2, 3])
 *
 * @since 2.5.0
 */
export function dropRight(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(0, as.length - n)
}
