import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/Effect unlessEffect
 */
export function unlessEffect_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  predicate: LazyArg<Effect<R2, E2, boolean>>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Option<A>> {
  return Effect.suspendSucceed(
    predicate().flatMap((b) => (b ? Effect.none : self.asSome()))
  )
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @ets_data_first unlessEffect_
 */
export function unlessEffect<R2, E2>(
  predicate: LazyArg<Effect<R2, E2, boolean>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Option<A>> =>
    self.unlessEffect(predicate)
}
