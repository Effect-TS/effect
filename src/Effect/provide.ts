import type { Effect } from "./effect"
import { provideSome_ } from "./provideSome"

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide_<E, A, R = unknown, R0 = unknown>(
  next: Effect<R & R0, E, A>,
  r: R
): Effect<R0, E, A> {
  return provideSome_(next, (r0: R0) => ({ ...r0, ...r }))
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 */
export function provide<R = unknown>(r: R) {
  return <E, A, R0 = unknown>(next: Effect<R & R0, E, A>): Effect<R0, E, A> =>
    provideSome_(next, (r0: R0) => ({ ...r0, ...r }))
}
