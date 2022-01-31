// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { foldCauseM_, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Recovers from all errors with provided cause.
 */
export function catchAllCause_<R2, E2, A2, R, E, A>(
  effect: Effect<R2, E2, A2>,
  f: (_: Cause<E2>) => Effect<R, E, A>,
  __trace?: string
) {
  return foldCauseM_(effect, f, succeed, __trace)
}

/**
 * Recovers from all errors with provided cause.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<R2, E2, A2, R, E, A>(
  f: (_: Cause<E2>) => Effect<R, E, A>,
  __trace?: string
) {
  return (effect: Effect<R2, E2, A2>) => catchAllCause_(effect, f, __trace)
}
