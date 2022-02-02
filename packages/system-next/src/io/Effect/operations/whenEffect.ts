import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/Effect whenEffect
 */
export function whenEffect_<R1, E1, A, R, E>(
  self: Effect<R1, E1, A>,
  predicate: LazyArg<Effect<R, E, boolean>>,
  __etsTrace?: string
) {
  return Effect.suspendSucceed(predicate).flatMap((a) =>
    a ? self.asUnit() : Effect.unit
  )
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @ets_data_first whenEffect_
 */
export function whenEffect<R, E>(
  predicate: LazyArg<Effect<R, E, boolean>>,
  __etsTrace?: string
) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => self.whenEffect(predicate)
}
