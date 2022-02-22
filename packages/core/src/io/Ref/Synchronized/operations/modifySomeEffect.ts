import { Tuple } from "../../../../collection/immutable/Tuple"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"
import { modifyEffect_ } from "./modifyEffect"

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySomeEffect_<RA, RB, RC, EA, EB, EC, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, A>,
  def: B,
  pf: (a: A) => Option<Effect<RC, EC, Tuple<[B, A]>>>,
  __etsTrace?: string
): Effect<RA & RB & RC, EA | EB | EC, B> {
  return modifyEffect_(self, (v) => pf(v).getOrElse(Effect.succeedNow(Tuple(def, v))))
}

/**
 * Atomically modifies the `XRef.Synchronized` with the specified function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @ets_data_first modifySomeEffect_
 */
export function modifySomeEffect<RC, EC, A, B>(
  def: B,
  pf: (a: A) => Option<Effect<RC, EC, Tuple<[B, A]>>>,
  __etsTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB & RC, EA | EB | EC, B> => modifySomeEffect_(self, def, pf)
}
