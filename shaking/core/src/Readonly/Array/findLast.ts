import type { Predicate, Refinement } from "../../Function"
import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

/**
 * Find the last element which satisfies a predicate function
 *
 * @example
 * import { findLast } from 'fp-ts/lib/ReadonlyArray'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(findLast((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 2 }))
 *
 * @since 2.5.0
 */
export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>
export function findLast<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A>
export function findLast<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return some(as[i])
      }
    }
    return none
  }
}
