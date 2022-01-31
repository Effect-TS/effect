// ets_tracing: off

import type { Effect } from "./effect.js"
import { fold_ } from "./fold.js"

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return fold_(
    self,
    () => true,
    () => false,
    __trace
  )
}
