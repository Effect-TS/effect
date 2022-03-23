import type { LazyArg } from "../../../data/Function"
import type { Sink } from "../definition"

/**
 * Like `zip`, but keeps only the result from the this sink.
 *
 * @tsplus operator ets/Sink <
 * @tsplus fluent ets/Sink zipLeft
 */
export function zipLeft_<R, R1, E, E1, In, In1 extends In, L, L1 extends L, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L1, Z> {
  return self.zipWith(that, (z, _) => z)
}

export const zipLeft = Pipeable(zipLeft_)
