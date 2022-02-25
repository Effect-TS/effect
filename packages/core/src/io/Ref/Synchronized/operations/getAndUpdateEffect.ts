import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately before modification.
 */
export function getAndUpdateEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) => f(v).map((result) => Tuple(v, result)))
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
  ): Effect<RA & RB & RC, EA | EB | EC, A> => getAndUpdateEffect_(self, f)
}
