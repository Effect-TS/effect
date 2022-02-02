// ets_tracing: off

import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { orElse_ } from "./orElse.js"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A2>(a: A2, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Effect<R, E, A>,
  a: A2,
  __trace?: string
): Effect<R, E, A | A2> {
  return orElse_(self, () => succeed(a), __trace)
}
