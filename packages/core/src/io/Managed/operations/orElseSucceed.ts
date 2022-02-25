import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @tsplus fluent ets/Managed orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Managed<R, E, A>,
  a: LazyArg<A2>,
  __tsplusTrace?: string
): Managed<R, never, A | A2> {
  return self | Managed.succeed(a)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<R, E, A, A2>(a: LazyArg<A2>, __tsplusTrace?: string) {
  return (self: Managed<R, E, A>): Managed<R, never, A | A2> => self.orElseSucceed(a)
}
