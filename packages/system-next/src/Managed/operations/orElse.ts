import type { Managed } from "../definition"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: () => Managed<R2, E2, A2>,
  __trace?: string
) {
  return foldManaged_(self, that, succeedNow, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 *
 * @ets_data_first orElse_
 */
export function orElse<R2, E2, A2>(that: () => Managed<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>) => orElse_(self, that, __trace)
}
