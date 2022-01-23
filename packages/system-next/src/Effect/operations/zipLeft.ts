import type { Effect } from "../definition"
import { as_ } from "./as"
import { chain_ } from "./chain"

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @ets fluent ets/Effect zipLeft
 * @ets operator ets/Effect <
 */
export function zipLeft_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, A> {
  return chain_(self, (a) => as_(that, a))
}

/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    zipLeft_(self, that)
}
