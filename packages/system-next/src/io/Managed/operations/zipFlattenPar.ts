import * as Tp from "../../../collection/immutable/Tuple"
import type { Managed } from "../definition"

/**
 * Zips this managed resource with the specified managed resource in
 * parallel.
 *
 * @ets fluent ets/Managed zipFlattenPar
 * @ets operator ets/Managed &
 */
export function zipFlattenPar_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R2, E | E2, Tp.MergeTuple<A, A2>> {
  return self.zipWithPar(that, Tp.mergeTuple)
}

/**
 * Zips this managed resource with the specified managed resource in
 * parallel.
 *
 * @ets_data_first zipFlattenPar_
 */
export function zipFlattenPar<R2, E2, A2>(
  that: Managed<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, E, A>(
    self: Managed<R, E, A>
  ): Managed<R & R2, E | E2, Tp.MergeTuple<A, A2>> => zipFlattenPar_(self, that)
}
