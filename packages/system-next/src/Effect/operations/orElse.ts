import type { Effect } from "../definition"
import { succeedNow } from "./succeedNow"
import { tryOrElse_ } from "./tryOrElse"

/**
 * Executes this effect and returns its value, if it succeeds, but otherwise
 * executes the specified effect.
 */
export function orElse_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: () => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E2, A | A2> {
  return tryOrElse_(self, that, (a) => succeedNow(a), __trace)
}

export function orElse<R2, E2, A2>(that: () => Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E2, A | A2> =>
    orElse_(self, that, __trace)
}
