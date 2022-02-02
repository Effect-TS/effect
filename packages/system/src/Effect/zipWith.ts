// ets_tracing: off

import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, R2, E2, A2, B>(
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __trace?: string
) {
  return <R, E>(a: Effect<R, E, A>): Effect<R & R2, E | E2, B> =>
    zipWith_(a, b, f, __trace)
}

/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 */
export function zipWith_<R, E, A, R2, E2, A2, B>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B,
  __trace?: string
): Effect<R & R2, E | E2, B> {
  return chain_(a, (ra) => map_(b, (rb) => f(ra, rb)), __trace)
}
