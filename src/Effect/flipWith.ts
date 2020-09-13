import type { Effect } from "./effect"
import { flip } from "./flip"

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 */
export function flipWith<S, R, E, A, S2, R2, E2, A2>(
  f: (self: Effect<S, R, A, E>) => Effect<S2, R2, A2, E2>
) {
  return (self: Effect<S, R, E, A>): Effect<S2, R2, E2, A2> => flipWith_(self, f)
}

/**
 *  Swaps the error/value parameters, applies the function `f` and flips the parameters back
 */
export function flipWith_<S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  f: (self: Effect<S, R, A, E>) => Effect<S2, R2, A2, E2>
) {
  return flip(f(flip(self)))
}
