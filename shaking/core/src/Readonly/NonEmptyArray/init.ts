import type { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

/**
 * Get all but the last element of a non empty array, creating a new array.
 *
 * @example
 * import { init } from 'fp-ts/lib/ReadonlyNonEmptyArray'
 *
 * assert.deepStrictEqual(init([1, 2, 3]), [1, 2])
 * assert.deepStrictEqual(init([1]), [])
 *
 * @since 2.5.0
 */
export function init<A>(nea: ReadonlyNonEmptyArray<A>): ReadonlyArray<A> {
  return nea.slice(0, -1)
}
