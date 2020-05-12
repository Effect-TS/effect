import type { Predicate, Refinement } from "../../Function"

import { spanIndexUncurry } from "./spanIndexUncurry"
/**
 * Calculate the longest initial subarray for which all element satisfy the specified predicate, creating a new array
 *
 * @example
 * import { takeLeftWhile } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(takeLeftWhile((n: number) => n % 2 === 0)([2, 4, 3, 6]), [2, 4])
 *
 * @since 2.5.0
 */
export function takeLeftWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => ReadonlyArray<B>
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A>
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const i = spanIndexUncurry(as, predicate)
    const init = Array(i)
    for (let j = 0; j < i; j++) {
      init[j] = as[j]
    }
    return init
  }
}
