// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"
/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets_data_first zip_
 */
export function zip<R2, E2, A2>(b: Effect<R2, E2, A2>, __trace?: string) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> =>
    zip_(a, b, __trace)
}

/**
 * Sequentially zips this effect with the specified effect
 */
export function zip_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return chain_(a, (ra) => map_(b, (rb) => Tp.tuple(ra, rb)), __trace)
}
