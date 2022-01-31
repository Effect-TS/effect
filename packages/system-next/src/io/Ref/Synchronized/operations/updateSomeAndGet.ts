import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it returns
 * the old value without changing it.
 */
export function updateSomeAndGetEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __etsTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, A> {
  return modifyEffect_(self, (v) =>
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
  __etsTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, A> => updateSomeAndGetEffect_(self, pf)
}
