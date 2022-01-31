// ets_tracing: off

import type { Effect } from "./effect.js"
import { orDieWith_ } from "./orDieWith.js"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export function orDie<R, E, A>(effect: Effect<R, E, A>, __trace?: string) {
  return orDieWith_(effect, (e: E) => e, __trace)
}
