import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @tsplus fluent ets/XSynchronized getAndUpdateEffect
 */
export function getAndUpdateEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(v, result)))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately before modification.
 *
 * @ets_data_first getAndUpdateEffect_
 */
export function getAndUpdateEffect<RC, EC, A>(
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => self.getAndUpdateEffect(f)
}
