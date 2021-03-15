// tracing: off

import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect forever (until the first error).
 */
export function forever<R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, never> {
  return chain_(effect, () => forever(effect), __trace)
}
