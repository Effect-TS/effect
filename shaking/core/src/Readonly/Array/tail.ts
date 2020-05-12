import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { isEmpty } from "./isEmpty"
/**
 * Get all but the first element of an array, creating a new array, or `None` if the array is empty
 *
 * @example
 * import { tail } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(tail([1, 2, 3]), some([2, 3]))
 * assert.deepStrictEqual(tail([]), none)
 *
 * @since 2.5.0
 */
export function tail<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  return isEmpty(as) ? none : some(as.slice(1))
}
