// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 */
export function mapErrorCause_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Cause<E2>,
  __trace?: string
) {
  return foldCauseM_(self, (c) => halt(f(c)), succeed, __trace)
}

/**
 * Returns an effect with its full cause of failure mapped using
 * the specified function. This can be used to transform errors
 * while preserving the original structure of Cause.
 */
export function mapErrorCause<E, E2>(
  f: (cause: Cause<E>) => Cause<E2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) =>
    foldCauseM_(self, (c) => halt(f(c)), succeed, __trace)
}
