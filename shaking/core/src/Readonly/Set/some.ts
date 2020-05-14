import type { Predicate } from "../../Function"

import { Next } from "./Next"
/**
 * @since 2.5.0
 */

export function some<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return (set) => {
    const values = set.values()
    let e: Next<A>
    let found = false
    // tslint:disable-next-line: strict-boolean-expressions
    while (!found && !(e = values.next()).done) {
      found = predicate(e.value)
    }
    return found
  }
}
