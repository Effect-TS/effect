import type { Eq } from "../../Eq"

import type { Next } from "./Next"

/**
 * Test whether or not a value is a member of a map
 *
 * @since 2.5.0
 */
export function elem<A>(E: Eq<A>): <K>(a: A, m: ReadonlyMap<K, A>) => boolean {
  return (a, m) => {
    const values = m.values()
    let e: Next<A>
    // tslint:disable-next-line: strict-boolean-expressions
    while (!(e = values.next()).done) {
      const v = e.value
      if (E.equals(a, v)) {
        return true
      }
    }
    return false
  }
}
