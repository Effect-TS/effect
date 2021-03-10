// tracing: off

import { chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"

/**
 * Run conditionally onTrue or onFalse
 *
 * @dataFirst ifM_
 * @trace 0
 * @trace 1
 */
export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>
) {
  return <R, E>(b: Effect<R, E, boolean>) => ifM_(b, onTrue, onFalse)
}

/**
 * Run conditionally onTrue or onFalse
 *
 * @trace 1
 * @trace 2
 */
export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  b: Effect<R, E, boolean>,
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>
) {
  return chain_(
    b,
    (x): Effect<R & R1 & R2, E | E1 | E2, A1 | A2> =>
      x ? suspend(onTrue) : suspend(onFalse)
  )
}

/**
 * Run conditionally onTrue or onFalse
 *
 * @dataFirst if_
 * @trace 0
 * @trace 1
 */
function _if<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>
) {
  return (b: boolean) => if_(b, onTrue, onFalse)
}

/**
 * Run conditionally onTrue or onFalse
 *
 * @trace 1
 * @trace 2
 */
export function if_<R1, E1, A1, R2, E2, A2>(
  b: boolean,
  onTrue: () => Effect<R1, E1, A1>,
  onFalse: () => Effect<R2, E2, A2>
) {
  return ifM_(succeed(b), onTrue, onFalse)
}

export { _if as if }
