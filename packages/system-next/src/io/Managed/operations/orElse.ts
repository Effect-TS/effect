import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @ets operator ets/Managed |
 * @ets fluent ets/Managed orElse
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: LazyArg<Managed<R2, E2, A2>>,
  __etsTrace?: string
) {
  return self.foldManaged(that, Managed.succeedNow)
}

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @ets_data_first orElse_
 */
export function orElse<R2, E2, A2>(
  that: LazyArg<Managed<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>) => orElse_(self, that)
}
