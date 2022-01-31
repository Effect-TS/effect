import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @tsplus fluent ets/Managed catchAllCause
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (cause: Cause<E>) => Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E2, A | A2> {
  return self.foldCauseManaged(f, Managed.succeedNow)
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
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R2, E2, A | A2> =>
    catchAllCause_(self, f)
}
