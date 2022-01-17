import * as Tp from "../../../Collections/Immutable/Tuple"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import * as T from "./_internal/effect"
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
  pf: (a: A) => O.Option<T.Effect<RC, EC, Tp.Tuple<[B, A]>>>
): T.Effect<RA & RB & RC, EA | EB | EC, B> {
  return modifyEffect_(self, (v) =>
    O.getOrElse_(pf(v), () => T.succeedNow(Tp.tuple(def, v)))
  )
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
  pf: (a: A) => O.Option<T.Effect<RC, EC, Tp.Tuple<[B, A]>>>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB & RC, EA | EB | EC, B> => modifySomeEffect_(self, def, pf)
}
