// ets_tracing: off

import type { Sync } from "./core.js"
import { fold_ } from "./core.js"

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(self: Sync<R, E, A>) {
  return fold_(
    self,
    () => true,
    () => false
  )
}
