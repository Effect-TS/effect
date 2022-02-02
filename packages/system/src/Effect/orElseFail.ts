// ets_tracing: off

import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { orElse_ } from "./orElse.js"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: E2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseFail_(self, e, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(
  self: Effect<R, E, A>,
  e: E2,
  __trace?: string
): Effect<R, E2, A> {
  return orElse_(self, () => fail(e), __trace)
}
