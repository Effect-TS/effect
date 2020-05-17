import type { Predicate, Refinement } from "../Function"
import { spanLeft as spanLeft_1 } from "../Readonly/Array/spanLeft"

/**
 * Split an array into two parts:
 * 1. the longest initial subarray for which all elements satisfy the specified predicate
 * 2. the remaining elements
 *
 * @example
 * import { spanLeft } from 'fp-ts/lib/Array'
 *
 * assert.deepStrictEqual(spanLeft((n: number) => n % 2 === 1)([1, 3, 2, 4, 5]), { init: [1, 3], rest: [2, 4, 5] })
 */
export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (
  as: Array<A>
) => {
  init: Array<B>
  rest: Array<A>
}
export function spanLeft<A>(
  predicate: Predicate<A>
): (
  as: Array<A>
) => {
  init: Array<A>
  rest: Array<A>
}
export function spanLeft<A>(
  predicate: Predicate<A>
): (
  as: Array<A>
) => {
  init: Array<A>
  rest: Array<A>
} {
  return spanLeft_1(predicate) as any
}
