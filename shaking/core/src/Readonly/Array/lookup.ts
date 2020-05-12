import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

import { isOutOfBound } from "./isOutOfBound"
/**
 * This function provides a safe way to read a value at a particular index from an array
 *
 * @example
 * import { lookup } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(lookup(1, [1, 2, 3]), some(2))
 * assert.deepStrictEqual(lookup(3, [1, 2, 3]), none)
 *
 * @since 2.5.0
 */
export function lookup<A>(i: number, as: ReadonlyArray<A>): Option<A> {
  return isOutOfBound(i, as) ? none : some(as[i])
}
