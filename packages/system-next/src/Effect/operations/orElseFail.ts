import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { orElse_ } from "./orElse"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(
  self: Effect<R, E, A>,
  e: E2,
  __trace?: string
): Effect<R, E2, A> {
  return orElse_(self, () => failNow(e), __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    orElseFail_(self, e, __trace)
}
