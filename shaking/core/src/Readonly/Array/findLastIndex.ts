import type { Predicate } from "../../Function"
import type { Option } from "../../Option/Option"
import { none } from "../../Option/none"
import { some } from "../../Option/some"

/**
 * Returns the index of the last element of the list which matches the predicate
 *
 * @example
 * import { findLastIndex } from 'fp-ts/lib/ReadonlyArray'
 * import { some, none } from 'fp-ts/lib/Option'
 *
 * interface X {
 *   a: number
 *   b: number
 * }
 * const xs: ReadonlyArray<X> = [{ a: 1, b: 0 }, { a: 1, b: 1 }]
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 1)(xs), some(1))
 * assert.deepStrictEqual(findLastIndex((x: { a: number }) => x.a === 4)(xs), none)
 *
 *
 * @since 2.5.0
 */
export function findLastIndex<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => {
    const len = as.length
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return some(i)
      }
    }
    return none
  }
}
