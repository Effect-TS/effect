// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { foldCauseManaged_ } from "./foldCauseManaged"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (cause: Cause<E>) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E2, A | A2> {
  return foldCauseManaged_(self, f, succeedNow, __trace)
}

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<E, R2, E2, A2>(
  f: (cause: Cause<E>) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A | A2> =>
    catchAllCause_(self, f, __trace)
}
