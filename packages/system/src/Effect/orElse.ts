import type { Effect } from "./effect"
import { ISucceed } from "./primitives"
import { tryOrElse_ } from "./tryOrElse_"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>
) {
  return tryOrElse_(self, that, (a) => new ISucceed(a))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse<R2, E2, A2>(that: () => Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>) =>
    tryOrElse_(self, that, (a) => new ISucceed(a))
}
