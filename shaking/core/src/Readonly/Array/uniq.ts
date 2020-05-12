import type { Eq } from "../../Eq"

import { elem } from "./elem"

/**
 * Remove duplicates from an array, keeping the first occurrence of an element.
 *
 * @example
 * import { uniq } from 'fp-ts/lib/ReadonlyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(uniq(eqNumber)([1, 2, 1]), [1, 2])
 *
 * @since 2.5.0
 */
export function uniq<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemS = elem(E)
  return (as) => {
    // tslint:disable-next-line: readonly-array
    const r: Array<A> = []
    const len = as.length
    let i = 0
    for (; i < len; i++) {
      const a = as[i]
      if (!elemS(a, r)) {
        r.push(a)
      }
    }
    return len === r.length ? as : r
  }
}
