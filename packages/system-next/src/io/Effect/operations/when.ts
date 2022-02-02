import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus fluent ets/Effect when
 */
export function when_<R1, E1, A>(
  self: Effect<R1, E1, A>,
  predicate: LazyArg<boolean>,
  __etsTrace?: string
): Effect<R1, E1, Option<A>> {
  return Effect.suspendSucceed(() =>
    predicate() ? self.map(Option.some) : Effect.succeedNow(Option.none)
  )
}

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @ets_data_first when_
 */
export function when(predicate: LazyArg<boolean>, __etsTrace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>): Effect<R1, E1, Option<A>> =>
    self.when(predicate)
}
