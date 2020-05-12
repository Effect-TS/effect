import type { Predicate, Refinement } from "../../Function"
import { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

/**
 * Find the first element which satisfies a predicate (or a refinement) function
 *
 * @example
 * import { findFirst } from 'fp-ts/lib/ReadonlyArray'
 * import { some } from 'fp-ts/lib/Option'
 *
 * assert.deepStrictEqual(findFirst((x: { a: number, b: number }) => x.a === 1)([{ a: 1, b: 1 }, { a: 1, b: 2 }]), some({ a: 1, b: 1 }))
 *
 * @since 2.5.0
 */
export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>
export function findFirst<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A>
export function findFirst<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length
    for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
        return some(as[i])
      }
    }
    return none
  }
}
