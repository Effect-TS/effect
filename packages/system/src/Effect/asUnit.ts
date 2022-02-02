// ets_tracing: off

import { chain_, unit } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Ignores the result of the effect replacing it with a void
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>, __trace?: string) {
  return chain_(self, () => unit, __trace)
}
