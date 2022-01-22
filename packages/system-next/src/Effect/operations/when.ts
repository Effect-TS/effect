import type { LazyArg } from "../../Function"
import * as O from "../../Option"
import type { Effect } from "../definition"
import { map_ } from "./map"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets fluent ets/Effect when
 */
export function when_<R1, E1, A>(
  self: Effect<R1, E1, A>,
  predicate: LazyArg<boolean>,
  __trace?: string
): Effect<R1, E1, O.Option<A>> {
  return suspendSucceed(
    () => (predicate() ? map_(self, O.some) : succeedNow(O.none)),
    __trace
  )
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets_data_first when_
 */
export function when(predicate: LazyArg<boolean>, __trace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>): Effect<R1, E1, O.Option<A>> =>
    when_(self, predicate, __trace)
}
