import type { Predicate, Refinement } from "../Function"
import type { Option } from "../Option/Option"
import { findLast as findLast_1 } from "../Readonly/Array/findLast"

/**
 * Find the last element which satisfies a predicate function
 *
 * @example
 * import { findLast } from 'fp-ts/lib/Array'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 *
 * @since 2.0.0
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findLast<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return findLast_1(predicate)
}
