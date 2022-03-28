import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Sink } from "../definition"

/**
 * @tsplus fluent ets/Sink zipFlatten
 */
export function zipFlatten_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L1, MergeTuple<Z, Z1>> {
  return self.zipWith(that, (z, z1) => Tuple.mergeTuple(z, z1))
}

export const zipFlatten = Pipeable(zipFlatten_)
