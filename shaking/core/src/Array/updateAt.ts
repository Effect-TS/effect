import type { Option } from "../Option/Option"
import { updateAt as updateAt_1 } from "../Readonly/Array/updateAt"

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { updateAt } from 'fp-ts/lib/Array'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 *
 * @since 2.0.0
 */
export const updateAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Option<Array<A>> = updateAt_1 as any
