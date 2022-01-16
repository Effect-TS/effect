// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { IO } from "../../Effect"
import * as O from "../../Option"
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
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
): IO<EA | EB, B> {
  return modify_(self, (v) => O.getOrElse_(f(v), () => Tp.tuple(def, v)), __trace)
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
  f: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
) {
  return <EA, EB>(self: XFiberRef<EA, EB, A, A>): IO<EA | EB, B> =>
    modifySome_(self, def, f, __trace)
}
