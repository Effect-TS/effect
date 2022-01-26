import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect } from "../definition"

/**
 * Zips this effect and that effect in parallel.
 *
 * @ets fluent ets/Effect zipPar
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> {
  return self.zipWithPar(that, Tp.tuple)
}

/**
 * Zips this effect and that effect in parallel.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<R2, E2, A2>(that: Effect<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Tp.Tuple<[A, A2]>> =>
    zipPar_(self, that)
}
