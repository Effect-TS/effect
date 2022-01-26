import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets fluent ets/Managed orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Managed<R, Option<E>, A>,
  a: LazyArg<A2>,
  __etsTrace?: string
): Managed<R, Option<E>, A | A2> {
  return self | Managed.succeed(a)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<R, E, A, A2>(a: LazyArg<A2>, __etsTrace?: string) {
  return (self: Managed<R, Option<E>, A>) => orElseSucceed_(self, a)
}
