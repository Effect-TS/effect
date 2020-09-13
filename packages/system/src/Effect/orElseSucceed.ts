import { succeed } from "./core"
import type { Effect } from "./effect"
import { orElse_ } from "./orElse"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed<A2>(a: A2) {
  return <S, R, E, A>(self: Effect<S, R, E, A>) => orElseSucceed_(self, a)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise succeeds with the specified value.
 */
export function orElseSucceed_<S, R, E, A, A2>(
  self: Effect<S, R, E, A>,
  a: A2
): Effect<S, R, E, A | A2> {
  return orElse_(self, () => succeed(a))
}
