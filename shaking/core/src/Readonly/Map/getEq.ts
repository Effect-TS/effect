import { Eq, fromEquals } from "../../Eq"

import { isSubmap } from "./isSubmap"

/**
 * @since 2.5.0
 */
export function getEq<K, A>(SK: Eq<K>, SA: Eq<A>): Eq<ReadonlyMap<K, A>> {
  const isSubmap_ = isSubmap(SK, SA)
  return fromEquals((x, y) => isSubmap_(x, y) && isSubmap_(y, x))
}
