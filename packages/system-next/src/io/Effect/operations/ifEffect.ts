import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @ets fluent ets/Effect ifEffect
 */
export function ifEffect_<R, R1, R2, E, E1, E2, A, A1>(
  self: Effect<R, E, boolean>,
  onTrue: LazyArg<Effect<R1, E1, A>>,
  onFalse: LazyArg<Effect<R2, E2, A1>>,
  __etsTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A | A1> {
  return self.flatMap(
    (b): Effect<R & R1 & R2, E | E1 | E2, A | A1> =>
      b ? Effect.suspendSucceed(onTrue) : Effect.suspendSucceed(onFalse)
  )
}

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @ets_data_first ifEffect_
 */
export function ifEffect<R1, R2, E1, E2, A, A1>(
  onTrue: LazyArg<Effect<R1, E1, A>>,
  onFalse: LazyArg<Effect<R2, E2, A1>>,
  __etsTrace?: string
) {
  return <R, E>(
    self: Effect<R, E, boolean>
  ): Effect<R & R1 & R2, E | E1 | E2, A | A1> =>
    ifEffect_(self, onTrue, onFalse, __etsTrace)
}
