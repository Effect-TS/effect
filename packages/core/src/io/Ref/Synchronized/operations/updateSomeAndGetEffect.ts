import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @tsplus fluent ets/XSynchronized updateSomeAndGetEffect
 */
export function updateSomeAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __tsplusTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return self.modifyEffect((v) =>
    pf(v)
      .getOrElse(Effect.succeedNow(v))
      .map((result) => Tuple(result, result))
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 *
 * @ets_data_first updateSomeAndGetEffect_
 */
export function updateSomeAndGetEffect<RC, EC, A>(
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => self.updateSomeAndGetEffect(pf)
}
