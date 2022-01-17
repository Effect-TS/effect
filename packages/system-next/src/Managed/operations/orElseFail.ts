import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { orElse_ } from "./orElse"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(
  self: Managed<R, E, A>,
  e: E2,
  __trace?: string
) {
  return orElse_(self, () => failNow(e), __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: E2, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>) => orElseFail_(self, e, __trace)
}
