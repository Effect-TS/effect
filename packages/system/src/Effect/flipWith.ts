// ets_tracing: off

import type { Effect } from "./effect.js"
import { flip } from "./flip.js"

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 *
 * @ets_data_first flipWith_
 */
export function flipWith<R, E, A, R2, E2, A2>(
  f: (self: Effect<R, A, E>) => Effect<R2, A2, E2>,
  __trace?: string
) {
  return (self: Effect<R, E, A>): Effect<R2, E2, A2> => flipWith_(self, f, __trace)
}

/**
 * Swaps the error/value parameters, applies the function `f` and flips the parameters back
 */
export function flipWith_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (self: Effect<R, A, E>) => Effect<R2, A2, E2>,
  __trace?: string
) {
  return flip(f(flip(self)), __trace)
}
