import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { isOutOfBound } from "./isOutOfBound"
import { unsafeDeleteAt } from "./unsafeDeleteAt"

/**
 * Delete the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { deleteAt } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(deleteAt(0)([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(deleteAt(1)([]), none)
 *
 * @since 2.5.0
 */
export function deleteAt(
  i: number
): <A>(as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeDeleteAt(i, as)))
}
