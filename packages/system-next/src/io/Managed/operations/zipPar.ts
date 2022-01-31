import { Tuple } from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"

/**
 * Zips this managed effect and that managed effect in parallel.
 *
 * @ets fluent ets/Managed zipPar
 */
export function zipPar_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E | E2, Tuple<[A, A2]>> {
  return self.zipWithPar(that, (a, a2) => Tuple(a, a2))
}

/**
 * Zips this managed effect and that managed effect in parallel.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<R2, E2, A2>(that: Managed<R2, E2, A2>, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, Tuple<[A, A2]>> =>
    zipPar_(self, that)
}
