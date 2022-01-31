import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 */
export function updateAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, A>,
  __etsTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) => f(v).map((result) => Tuple(result, result)))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 *
 * @ets_data_first updateAndGetEffect_
 */
export function updateAndGetEffect<RC, EC, A>(
  f: (a: A) => Effect<RC, EC, A>,
  __etsTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => updateAndGetEffect_(self, f)
}
