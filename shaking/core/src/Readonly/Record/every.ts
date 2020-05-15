import type { Predicate } from "../../Function"

import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function every<A>(
  predicate: Predicate<A>
): (r: ReadonlyRecord<string, A>) => boolean {
  return (r) => {
    for (const k in r) {
      if (!predicate(r[k])) {
        return false
      }
    }
    return true
  }
}
