import type { Cause } from "../Cause/cause"
import { foldCauseM_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Recovers from all errors with provided cause.
 */
export function catchAllCause_<S2, R2, E2, A2, S, R, E, A>(
  effect: Effect<S2, R2, E2, A2>,
  f: (_: Cause<E2>) => Effect<S, R, E, A>
) {
  return foldCauseM_(effect, f, (x) => succeed(x))
}

/**
 * Recovers from all errors with provided cause.
 */
export function catchAllCause<S2, R2, E2, A2, S, R, E, A>(
  f: (_: Cause<E2>) => Effect<S, R, E, A>
) {
  return (effect: Effect<S2, R2, E2, A2>) => foldCauseM_(effect, f, (x) => succeed(x))
}
