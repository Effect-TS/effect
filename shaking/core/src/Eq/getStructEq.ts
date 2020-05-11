import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"

import type { Eq } from "./Eq"
import { fromEquals } from "./fromEquals"

/**
 * @since 2.0.0
 */
export function getStructEq<O extends ReadonlyRecord<string, any>>(
  eqs: {
    [K in keyof O]: Eq<O[K]>
  }
): Eq<O> {
  return fromEquals((x, y) => {
    for (const k in eqs) {
      if (!eqs[k].equals(x[k], y[k])) {
        return false
      }
    }
    return true
  })
}
