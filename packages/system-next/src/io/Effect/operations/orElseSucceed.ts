import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets fluent ets/Effect orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Effect<R, E, A>,
  a: LazyArg<A2>,
  __etsTrace?: string
): Effect<R, E, A | A2> {
  return self.orElse(Effect.succeed(a))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A2>(a: LazyArg<A2>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a)
}
