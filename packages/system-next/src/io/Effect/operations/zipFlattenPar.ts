import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect } from "../definition"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus operator ets/Effect &
 * @tsplus fluent ets/Effect zipFlattenPar
 */
export function zipFlattenPar_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tp.MergeTuple<A, A2>> {
  return self.zipWithPar(that, Tp.mergeTuple)
}

/**
 * Sequentially zips this effect with the specified effect
 *
 * @ets_data_first zipFlattenPar_
 */
export function zipFlattenPar<R2, E2, A2>(
  that: Effect<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, E, A>(
    self: Effect<R, E, A>
  ): Effect<R & R2, E | E2, Tp.MergeTuple<A, A2>> => zipFlattenPar_(self, that)
}
