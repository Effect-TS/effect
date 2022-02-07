// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Returns an effect that swaps the error/success cases. This allows you to
 * use all methods on the error channel, possibly before flipping back.
 */
export function flip<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return foldM_(self, succeed, fail, __trace)
}
