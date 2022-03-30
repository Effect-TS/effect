import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Effect } from "../../../Effect"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately after modification.
 *
 * @tsplus fluent ets/Ref/Synchronized updateAndGetEffect
 */
export function updateAndGetEffect_<R, E, A>(
  self: SynchronizedRef<A>,
  f: (a: A) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.modifyEffect((v) => f(v).map((result) => Tuple(result, result)))
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified function,
 * returning the value immediately after modification.
 */
export const updateAndGetEffect = Pipeable(updateAndGetEffect_)
