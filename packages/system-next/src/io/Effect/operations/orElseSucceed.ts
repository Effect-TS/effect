import type { Effect } from "../definition"
import { orElse_ } from "./orElse"
import { succeedNow } from "./succeedNow"

// TODO(Mike/Max): make a lazy

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets fluent ets/Effect orElseSucceed
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Effect<R, E, A>,
  a: A2,
  __etsTrace?: string
): Effect<R, E, A | A2> {
  return orElse_(self, () => succeedNow(a), __etsTrace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A2>(a: A2, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a, __etsTrace)
}
