import type { Ord } from "../Ord"
import { groupSort as groupSort_1 } from "../Readonly/NonEmptyArray/groupSort"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * Sort and then group the elements of an array into non empty arrays.
 *
 * @example
 * import { cons, groupSort } from 'fp-ts/lib/NonEmptyArray'
 * import { ordNumber } from 'fp-ts/lib/Ord'
 *
 * assert.deepStrictEqual(groupSort(ordNumber)([1, 2, 1, 1]), [cons(1, [1, 1]), cons(2, [])])
 *
 * @since 2.0.0
 */
export const groupSort: <A>(
  O: Ord<A>
) => (as: Array<A>) => Array<NonEmptyArray<A>> = groupSort_1 as any
