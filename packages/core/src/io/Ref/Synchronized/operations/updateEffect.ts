import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 *
 * @tsplus fluent ets/XSynchronized updateEffect
 */
export function updateEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, void> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(undefined, result)))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function.
 *
 * @ets_data_first updateEffect_
 */
export function updateEffect<RC, EC, A>(
  f: (a: A) => Effect<RC, EC, A>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, void> => self.updateEffect(f)
}
