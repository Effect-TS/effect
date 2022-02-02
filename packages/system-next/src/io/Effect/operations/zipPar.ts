import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * Zips this effect and that effect in parallel.
 *
 * @tsplus fluent ets/Effect zipPar
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
): Effect<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.zipWithPar(that, (a, b) => Tuple(a, b))
}

/**
 * Zips this effect and that effect in parallel.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, Tuple<[A, A2]>> =>
    self.zipPar(that)
}
