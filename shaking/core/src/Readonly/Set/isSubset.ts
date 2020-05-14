import type { Eq } from "../../Eq"

import { elem } from "./elem"
import { every } from "./every"

/**
 * `true` if and only if every element in the first set is an element of the second set
 *
 * @since 2.5.0
 */

export function isSubset<A>(
  E: Eq<A>
): (x: ReadonlySet<A>, y: ReadonlySet<A>) => boolean {
  const elemE = elem(E)
  return (x, y) => every((a: A) => elemE(a, y))(x)
}
