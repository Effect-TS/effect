import type { Predicate, Refinement } from "../../Function"

import type { Spanned } from "./Spanned"
import { spanIndexUncurry } from "./spanIndexUncurry"

/**
 * Split an array into two parts:
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 *
 * @example
 * import { spanLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 *
 * @since 2.5.0
 */
export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Spanned<B, A>
export function spanLeft<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Spanned<A, A>
export function spanLeft<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Spanned<A, A> {
  return (as) => {
    const i = spanIndexUncurry(as, predicate)
    const init = Array(i)
    for (let j = 0; j < i; j++) {
      init[j] = as[j]
    }
    const l = as.length
    const rest = Array(l - i)
    for (let j = i; j < l; j++) {
      rest[j - i] = as[j]
    }
    return { init, rest }
  }
}
