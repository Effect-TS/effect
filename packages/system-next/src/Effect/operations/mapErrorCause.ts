// ets_tracing: off

// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Effect } from "../definition"
import { failCause } from "./failCause"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 */
export function mapErrorCause_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Cause<E2>,
  __trace?: string
): Effect<R, E2, A> {
  return foldCauseEffect_(self, (c) => failCause(f(c)), succeedNow, __trace)
}

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E2>(
  f: (cause: Cause<E>) => Cause<E2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    mapErrorCause_(self, f, __trace)
}
