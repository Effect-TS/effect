import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @tsplus fluent ets/Effect unless
 */
export function unless_<R, E, A>(
  self: Effect<R, E, A>,
  predicate: LazyArg<boolean>,
  __etsTrace?: string
): Effect<R, E, Option<A>> {
  return Effect.suspendSucceed(() => (predicate() ? Effect.none : self.asSome()))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets_data_first unless_
 */
export function unless(predicate: LazyArg<boolean>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, Option<A>> =>
    unless_(self, predicate)
}
