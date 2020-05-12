import type { Eq } from "../../Eq"

import { concat } from "./concat"
import { elem } from "./elem"

/**
 * Creates an array of unique values, in order, from all given arrays using a `Eq` for equality comparisons
 *
 * @example
 * import { union } from 'fp-ts/lib/ReadonlyArray'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(union(eqNumber)([1, 2], [2, 3]), [1, 2, 3])
 *
 * @since 2.5.0
 */
export function union<A>(
  E: Eq<A>
): (xs: ReadonlyArray<A>, ys: ReadonlyArray<A>) => ReadonlyArray<A> {
  const elemE = elem(E)
  return (xs, ys) =>
    concat(
      xs,
      ys.filter((a) => !elemE(a, xs))
    )
}
