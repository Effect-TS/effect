import { Eq, fromEquals } from "../../Eq"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { isSubrecord } from "./isSubrecord"

/**
 * @since 2.5.0
 */
export function getEq<K extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<K, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> {
  const isSubrecordE = isSubrecord(E)
  return fromEquals((x, y) => isSubrecordE(x, y) && isSubrecordE(y, x))
}
