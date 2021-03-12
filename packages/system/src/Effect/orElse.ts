// tracing: off

import { succeed, tryOrElse_ } from "./core"
import type { Effect } from "./effect"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  __trace?: string
) {
  return tryOrElse_(self, that, succeed, __trace)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 *
 * @dataFirst orElse_
 */
export function orElse<R2, E2, A2>(that: () => Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => orElse_(self, that, __trace)
}
