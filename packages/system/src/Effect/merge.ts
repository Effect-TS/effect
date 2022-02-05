// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 */
export function merge<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, never, E | A> {
  return foldM_(self, succeed, succeed, __trace)
}
