import type { Effect } from "./effect"
import { ISucceed } from "./primitives"
import { tryOrElse_ } from "./tryOrElse_"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse_<S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: () => Effect<S2, R2, E2, A2>
) {
  return tryOrElse_(self, that, (a) => new ISucceed(a))
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise executes the specified effect.
 */
export function orElse<S2, R2, E2, A2>(that: () => Effect<S2, R2, E2, A2>) {
  return <S, R, E, A>(self: Effect<S, R, E, A>) =>
    tryOrElse_(self, that, (a) => new ISucceed(a))
}
