import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail<E2>(e: E2) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseFail_(self, e)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 */
export function orElseFail_<R, E, A, E2>(
  self: Effect<R, E, A>,
  e: E2
): Effect<R, E2, A> {
  return orElse_(self, fail(e))
}
