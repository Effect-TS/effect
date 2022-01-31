// ets_tracing: off

import type { Sync } from "./core.js"
import { fold_ } from "./core.js"

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(self: Sync<R, E, A>) {
  return fold_(
    self,
    () => false,
    () => true
  )
}
