// ets_tracing: off

import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Repeats this effect the specified number of times.
 *
 * @ets_data_first repeatN_
 */
export function repeatN(n: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => repeatN_(self, n, __trace)
}

/**
 * Repeats this effect the specified number of times.
 */
export function repeatN_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __trace?: string
): Effect<R, E, A> {
  return chain_(self, (a) => (n <= 0 ? succeed(a) : repeatN_(self, n - 1)), __trace)
}
