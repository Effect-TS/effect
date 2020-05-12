/**
 * Drop a number of elements from the start of an array, creating a new array
 *
 * @example
 * import { dropLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(dropLeft(2)([1, 2, 3]), [3])
 *
 * @since 2.5.0
 */
export function dropLeft(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(n, as.length)
}
