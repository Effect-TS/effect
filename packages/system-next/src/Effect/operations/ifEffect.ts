import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 */
export function ifEffect_<R, R1, R2, E, E1, E2, A, A1>(
  self: Effect<R, E, boolean>,
  onTrue: () => Effect<R1, E1, A>,
  onFalse: () => Effect<R2, E2, A1>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A | A1> {
  return chain_(
    self,
    (b): Effect<R & R1 & R2, E | E1 | E2, A | A1> =>
      b ? suspendSucceed(onTrue) : suspendSucceed(onFalse),
    __trace
  )
}

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @ets_data_first ifEffect_
 */
export function ifEffect<R1, R2, E1, E2, A, A1>(
  onTrue: () => Effect<R1, E1, A>,
  onFalse: () => Effect<R2, E2, A1>,
  __trace?: string
) {
  return <R, E>(
    self: Effect<R, E, boolean>
  ): Effect<R & R1 & R2, E | E1 | E2, A | A1> =>
    ifEffect_(self, onTrue, onFalse, __trace)
}
