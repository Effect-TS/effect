import type { Option } from "../Option/Option"
import { insertAt as insertAt_1 } from "../Readonly/Array/insertAt"

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { insertAt } from 'fp-ts/lib/Array'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 */
export const insertAt: <A>(
  i: number,
  a: A
) => (as: Array<A>) => Option<Array<A>> = insertAt_1 as any
