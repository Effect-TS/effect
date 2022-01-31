// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import { foldCauseM_, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Exposes the full cause of failure of this effect.
 */
export function sandbox<R, E, A>(
  fa: Effect<R, E, A>,
  __trace?: string
): Effect<R, Cause<E>, A> {
  return foldCauseM_(fa, fail, succeed, __trace)
}
