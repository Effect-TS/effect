// ets_tracing: off

import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Returns a new effect where boolean value of this effect is negated.
 */
export function negate<R, E>(
  self: Effect<R, E, boolean>,
  __trace?: string
): Effect<R, E, boolean> {
  return map_(self, (b) => !b)
}
