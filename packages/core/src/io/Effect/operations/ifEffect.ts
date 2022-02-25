import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @tsplus static ets/EffectOps ifEffect
 */
export function ifEffect<R, R1, R2, E, E1, E2, A, A1>(
  b: LazyArg<Effect<R, E, boolean>>,
  onTrue: LazyArg<Effect<R1, E1, A>>,
  onFalse: LazyArg<Effect<R2, E2, A1>>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A | A1> {
  return Effect.suspendSucceed(b().flatMap((b) => (b ? onTrue() : onFalse())))
}
