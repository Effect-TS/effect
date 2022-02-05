// ets_tracing: off

import { chain_ } from "../core.js"
import type { Managed } from "../managed.js"
import { succeed } from "../succeed.js"

/**
 * Conditional logic
 *
 * @ets_data_first ifM_
 */
export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, E>(b: Managed<R, E, boolean>) => ifM_(b, onTrue, onFalse, __trace)
}

/**
 * Conditional logic
 */
export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  b: Managed<R, E, boolean>,
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return chain_(
    b,
    (x) => (x ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()),
    __trace
  )
}

/**
 * Conditional logic
 *
 * @ets_data_first if_
 */
function _if<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>
) {
  return (b: boolean) => if_(b, onTrue, onFalse)
}

/**
 * Conditional logic
 */
export function if_<R1, E1, A1, R2, E2, A2>(
  b: boolean,
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return ifM_(succeed(b), onTrue, onFalse, __trace)
}

export { _if as if }
