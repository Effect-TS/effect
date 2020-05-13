import type { Predicate, Refinement } from "../Function"
import type { Option } from "../Option/Option"
import { findFirst as findFirst_1 } from "../Readonly/Array/findFirst"

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * @example
 * import { findFirst } from 'fp-ts/lib/Array'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(findFirst((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 *
 * @since 2.0.0
 */
export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: Array<A>) => Option<B>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A>
export function findFirst<A>(predicate: Predicate<A>): (as: Array<A>) => Option<A> {
  return findFirst_1(predicate)
}
