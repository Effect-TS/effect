import type { Effect } from "../definition"
import { chain_ } from "./chain"

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 */
export function zipRight_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A2> {
  return chain_(self, () => that, __trace)
}

/**
 * A variant of `flatMap` that ignores the value produced by this effect.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<R2, E2, A2>(that: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A2> =>
    zipRight_(self, that, __trace)
}
