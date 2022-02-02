// ets_tracing: off

import type { Effect } from "./effect"
import { fold_ } from "./fold"

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
