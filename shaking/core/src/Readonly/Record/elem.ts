import type { Eq } from "../../Eq"

import type { ReadonlyRecord } from "./ReadonlyRecord"

/**
 * @since 2.5.0
 */
export function elem<A>(E: Eq<A>): (a: A, fa: ReadonlyRecord<string, A>) => boolean {
  return (a, fa) => {
    for (const k in fa) {
      if (E.equals(fa[k], a)) {
        return true
      }
    }
    return false
  }
}
