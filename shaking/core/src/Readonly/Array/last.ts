import type { Option } from "../../Option/Option"

import { lookup } from "./lookup"

/**
 * Get the last element in an array, or `None` if the array is empty
 *
 * @example
 * import { last } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(last([1, 2, 3]), some(3))
 * assert.deepStrictEqual(last([]), none)
 *
 * @since 2.5.0
 */
export function last<A>(as: ReadonlyArray<A>): Option<A> {
  return lookup(as.length - 1, as)
}
