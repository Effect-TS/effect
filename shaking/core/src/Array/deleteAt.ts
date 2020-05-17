import type { Option } from "../Option/Option"
import { deleteAt as deleteAt_1 } from "../Readonly/Array/deleteAt"

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { deleteAt } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 *
 */
export const deleteAt: (
  i: number
) => <A>(as: Array<A>) => Option<Array<A>> = deleteAt_1 as any
