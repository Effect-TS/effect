import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { SynchronizedRef } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @tsplus fluent ets/Ref/Synchronized updateSomeAndGetEffect
 */
export function updateSomeAndGetEffect_<R, E, A>(
  self: SynchronizedRef<A>,
  pf: (a: A) => Option<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.modifyEffect((v) =>
    pf(v)
      .getOrElse(Effect.succeedNow(v))
      .map((result) => Tuple(result, result))
  )
}

/**
 * Atomically modifies the `Ref.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 */
export const updateSomeAndGetEffect = Pipeable(updateSomeAndGetEffect_)
