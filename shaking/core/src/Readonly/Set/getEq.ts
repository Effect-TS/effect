import { Eq, fromEquals } from "../../Eq"

import { isSubset } from "./isSubset"
/**
 * @since 2.5.0
 */

export function getEq<A>(E: Eq<A>): Eq<ReadonlySet<A>> {
  const subsetE = isSubset(E)
  return fromEquals((x, y) => subsetE(x, y) && subsetE(y, x))
}
