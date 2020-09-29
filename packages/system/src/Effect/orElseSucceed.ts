import { succeed } from "./core"
import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed<A2>(a: A2) {
  return <R, E, A>(self: Effect<R, E, A>) => orElseSucceed_(self, a)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<R, E, A, A2>(
  self: Effect<R, E, A>,
  a: A2
): Effect<R, E, A | A2> {
  return orElse_(self, () => succeed(a))
}
