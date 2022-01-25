import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets fluent ets/Effect zip
 */
export function zip_<R, E, A, R2, E2, A2>(
  a: Effect<R, E, A>,
  b: Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return chain_(a, (ra) => map_(b, (rb) => Tp.tuple(ra, rb)), __etsTrace)
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets_data_first zip_
 */
export function zip<R2, E2, A2>(b: Effect<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(a: Effect<R, E, A>): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> =>
    zip_(a, b, __etsTrace)
}
