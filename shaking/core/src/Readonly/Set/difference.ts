import type { Eq } from "../../Eq"

import { elem } from "./elem"
import { filter } from "./filter"

/**
 * Form the set difference (`x` - `y`)
 *
 * @example
 * import { difference } from 'fp-ts/lib/ReadonlySet'
 * import { eqNumber } from 'fp-ts/lib/Eq'
 *
 * assert.deepStrictEqual(difference(eqNumber)(new Set([1, 2]), new Set([1, 3])), new Set([2]))
 *
 *
 * @since 2.5.0
 */

export function difference<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => ReadonlySet<A> {
  const elemE = elem(E)
  return (x, y) => filter((a: A) => !elemE(a, y))(x)
}
