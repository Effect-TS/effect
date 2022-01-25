import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"
import { succeedNow } from "./succeedNow"
import { tryOrElse_ } from "./tryOrElse"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @ets operator ets/Effect |
 * @ets fluent ets/Effect orElse
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E2, A | A2> {
  return tryOrElse_(self, that, (a) => succeedNow(a), __etsTrace)
}

/**
 * @ets_data_first orElse_
 */
export function orElse<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E2, A | A2> =>
    orElse_(self, that, __etsTrace)
}
