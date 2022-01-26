import type { Cause } from "../../Cause"
import { Effect } from "../definition"

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @ets fluent ets/Effect catchAllCause
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E2, A | A2> {
  return self.foldCauseEffect(f, Effect.succeedNow)
}

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @ets_data_first catchAllCause_
 */
export function catchAllCause<E, R2, E2, A2>(
  f: (cause: Cause<E>) => Effect<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E2, A | A2> =>
    catchAllCause_(self, f)
}
