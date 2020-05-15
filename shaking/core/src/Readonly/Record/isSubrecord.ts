import type { Eq } from "../../Eq"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @since 2.5.0
 */
export function isSubrecord<A>(
  E: Eq<A>
): (x: ReadonlyRecord<string, A>, y: ReadonlyRecord<string, A>) => boolean {
  return (x, y) => {
    for (const k in x) {
      if (!_hasOwnProperty.call(y, k) || !E.equals(x[k], y[k])) {
        return false
      }
    }
    return true
  }
}
