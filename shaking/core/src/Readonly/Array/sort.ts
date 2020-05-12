import type { Ord } from "../../Ord"

/**
 * Sort the elements of an array in increasing order, creating a new array
 *
 * @example
 * import { sort } from 'fp-ts/lib/ReadonlyArray'
 * import { ordNumber } from 'fp-ts/lib/Ord'
 *
 * assert.deepStrictEqual(sort(ordNumber)([3, 2, 1]), [1, 2, 3])
 *
 * @since 2.5.0
 */
export function sort<A>(O: Ord<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => [...as].sort(O.compare)
}
