import { Predicate, not } from "../../Function"

import { some } from "./some"
/**
 * @since 2.5.0
 */

export function every<A>(predicate: Predicate<A>): (set: ReadonlySet<A>) => boolean {
  return not(some(not(predicate)))
}
