import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { isOutOfBound } from "./isOutOfBound"
import { unsafeUpdateAt } from "./unsafeUpdateAt"

/**
 * Change the element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { updateAt } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(updateAt(1, 1)([1, 2, 3]), some([1, 1, 3]))
 * assert.deepStrictEqual(updateAt(1, 1)([]), none)
 *
 * @since 2.5.0
 */
export function updateAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (isOutOfBound(i, as) ? none : some(unsafeUpdateAt(i, a, as)))
}
