// ets_tracing: off

import type { Effect } from "./effect.js"
import { provideSome_ } from "./provideSome.js"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @ets_data_first provide_
 */
export function provide<R>(r: R, __trace?: string) {
  return <E, A, R0>(next: Effect<R & R0, E, A>): Effect<R0, E, A> =>
    provide_(next, r, __trace)
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide_<E, A, R0, R>(
  next: Effect<R & R0, E, A>,
  r: R,
  __trace?: string
): Effect<R0, E, A> {
  return provideSome_(next, (r0: R0) => ({ ...r0, ...r }), __trace)
}
