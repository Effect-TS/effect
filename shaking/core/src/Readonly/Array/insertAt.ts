import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { unsafeInsertAt } from "./unsafeInsertAt"

/**
 * Insert an element at the specified index, creating a new array, or returning `None` if the index is out of bounds
 *
 * @example
 * import { insertAt } from 'fp-ts/lib/ReadonlyArray'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(insertAt(2, 5)([1, 2, 3, 4]), some([1, 2, 5, 3, 4]))
 *
 * @since 2.5.0
 */
export function insertAt<A>(
  i: number,
  a: A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => (i < 0 || i > as.length ? none : some(unsafeInsertAt(i, a, as)))
}
