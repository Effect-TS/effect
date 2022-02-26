import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 *
 * @tsplus fluent ets/XSynchronized updateAndGetEffect
 */
export function updateAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(result, result)))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * returning the value immediately after modification.
 *
 * @ets_data_first updateAndGetEffect_
 */
export function updateAndGetEffect<RC, EC, A>(
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => self.updateAndGetEffect(f)
}
