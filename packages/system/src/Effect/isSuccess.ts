// ets_tracing: off

import type { Effect } from "./effect.js"
import { fold_ } from "./fold.js"

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return fold_(
    self,
    () => false,
    () => true,
    __trace
  )
}
