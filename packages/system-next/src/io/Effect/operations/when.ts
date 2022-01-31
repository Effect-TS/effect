import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { none as optionNone, some as optionSome } from "../../../data/Option/core"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets fluent ets/Effect when
 */
export function when_<R1, E1, A>(
  self: Effect<R1, E1, A>,
  predicate: LazyArg<boolean>,
  __etsTrace?: string
): Effect<R1, E1, Option<A>> {
  return Effect.suspendSucceed(() =>
    predicate() ? self.map(optionSome) : Effect.succeedNow(optionNone)
  )
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets_data_first when_
 */
export function when(predicate: LazyArg<boolean>, __etsTrace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>): Effect<R1, E1, Option<A>> =>
    when_(self, predicate)
}
