import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import type { IO } from "../../Effect"
import type { XFiberRef } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XFiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 */
export function modifySome_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, A>,
  def: B,
  f: (a: A) => Option<Tuple<[B, A]>>,
  __etsTrace?: string
): IO<EA | EB, B> {
  return modify_(self, (v) => f(v).getOrElse(Tuple(def, v)))
}

/**
 * Atomically modifies the `XFiberRef` with the specified partial function,
 * which computes a return value for the modification if the function is
 * defined in the current value otherwise it returns a default value. This
 * is a more powerful version of `updateSome`.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<B, A>(
  def: B,
  f: (a: A) => Option<Tuple<[B, A]>>,
  __etsTrace?: string
) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, B> =>
    modifySome_(self, def, f)
}
