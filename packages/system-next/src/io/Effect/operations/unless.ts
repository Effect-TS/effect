import type { LazyArg } from "../../../data/Function"
import type * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { asSome } from "./asSome"
import { none } from "./none"
import { suspendSucceed } from "./suspendSucceed"

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets fluent ets/Effect unless
 */
export function unless_<R, E, A>(
  self: Effect<R, E, A>,
  predicate: LazyArg<boolean>,
  __etsTrace?: string
): Effect<R, E, O.Option<A>> {
  return suspendSucceed(() => (predicate() ? none : asSome(self)))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets_data_first unless_
 */
export function unless(predicate: LazyArg<boolean>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, O.Option<A>> =>
    unless_(self, predicate, __etsTrace)
}
