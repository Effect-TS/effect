// ets_tracing: off

import { chain_, yieldNow } from "./core"
import type { Effect } from "./effect"
import { zipRight_ } from "./zips"

/**
 * Repeats this effect forever (until the first error).
 */
export function forever<R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, never> {
  return chain_(effect, () => zipRight_(yieldNow, forever(effect)), __trace)
}
