import type { Cause } from "../Cause/cause"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 */
export function mapErrorCause_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Cause<E2>
) {
  return foldCauseM_(self, (c) => halt(f(c)), succeed)
}

/**
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 */
export function mapErrorCause<E, E2>(f: (cause: Cause<E>) => Cause<E2>) {
  return <R, A>(self: Effect<R, E, A>) => foldCauseM_(self, (c) => halt(f(c)), succeed)
}
