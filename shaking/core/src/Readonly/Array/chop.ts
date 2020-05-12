import type { ReadonlyNonEmptyArray } from "fp-ts/lib/ReadonlyNonEmptyArray"

import { isNonEmpty } from "./isNonEmpty"

/**
 * A useful recursion pattern for processing an array to produce a new array, often used for "chopping" up the input
 * array. Typically chop is called with some function that will consume an initial prefix of the array and produce a
 * value and the rest of the array.
 *
 * @example
 * import { Eq, eqNumber } from 'fp-ts/lib/Eq'
 * import { chop, spanLeft } from 'fp-ts/lib/ReadonlyArray'
 *
 * const group = <A>(S: Eq<A>): ((as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>>) => {
 *   return chop(as => {
 *     const { init, rest } = spanLeft((a: A) => S.equals(a, as[0]))(as)
 *     return [init, rest]
 *   })
 * }
 * assert.deepStrictEqual(group(eqNumber)([1, 1, 2, 3, 3, 4]), [[1, 1], [2], [3, 3], [4]])
 *
 * @since 2.5.0
 */
export function chop<A, B>(
  f: (as: ReadonlyNonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    // tslint:disable-next-line: readonly-array
    const result: Array<B> = []
    let cs: ReadonlyArray<A> = as
    while (isNonEmpty(cs)) {
      const [b, c] = f(cs)
      result.push(b)
      cs = c
    }
    return result
  }
}
