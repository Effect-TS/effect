import type { Predicate } from "../Function"
import { dropLeftWhile as dropLeftWhile_1 } from "../Readonly/Array/dropLeftWhile"

/**
 * Remove the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { dropLeftWhile } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(dropLeftWhile((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), [2, 4, 5])
 *
 */
export const dropLeftWhile: <A>(
  predicate: Predicate<A>
) => (as: Array<A>) => Array<A> = dropLeftWhile_1 as any
