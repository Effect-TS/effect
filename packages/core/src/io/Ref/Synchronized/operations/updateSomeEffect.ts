import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 */
export function updateSomeEffect_<RA, RB, RC, EA, EB, EC, A>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __etsTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, void> {
  return modifyEffect_(self, (v) =>
    pf(v)
      .getOrElse(Effect.succeedNow(v))
      .map((result) => Tuple(undefined, result))
  )
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified partial
 * function. If the function is undefined on the current value it doesn't
 * change it.
 *
 * @ets_data_first updateSomeEffect_
 */
export function updateSomeEffect<RC, EC, A>(
  pf: (a: A) => Option<Effect<RC, EC, A>>,
  __etsTrace?: string
) {
  ;<RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, void> => updateSomeEffect_(self, pf)
}
