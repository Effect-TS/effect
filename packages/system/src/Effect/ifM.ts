// ets_tracing: off

import { chain_, succeed, suspend } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Run conditionally onTrue or onFalse
 *
 * @ets_data_first ifM_
 */
export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, E>(b: Effect<R, E, boolean>) => ifM_(b, onTrue, onFalse, __trace)
}

/**
 * Run conditionally onTrue or onFalse
 */
export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  b: Effect<R, E, boolean>,
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return chain_(
    b,
    (x): Effect<R & R1 & R2, E | E1 | E2, A1 | A2> =>
      x ? suspend(onTrue, __trace) : suspend(onFalse, __trace)
  )
}

/**
 * Run conditionally onTrue or onFalse
 *
 * @ets_data_first if_
 */
function _if<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return (b: boolean) => if_(b, onTrue, onFalse, __trace)
}

/**
 * Run conditionally onTrue or onFalse
 */
export function if_<R1, E1, A1, R2, E2, A2>(
  b: boolean,
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return ifM_(succeed(b), onTrue, onFalse, __trace)
}

export { _if as if }
