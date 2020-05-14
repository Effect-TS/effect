import type { Eq } from "../../Eq"

import type { Next } from "./Next"

/**
 * Test if a value is a member of a set
 *
 * @since 2.5.0
 */

export function elem<A>(E: Eq<A>): (a: A, set: ReadonlySet<A>) => boolean {
  return (a, set) => {
    const values = set.values()
    let e: Next<A>
    let found = false
    // tslint:disable-next-line: strict-boolean-expressions
    while (!found && !(e = values.next()).done) {
      found = E.equals(a, e.value)
    }
    return found
  }
}
