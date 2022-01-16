// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import { matchTag_ } from "../../Utils"
import * as A from "../Atomic/operations/modifySome"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function, which
 * computes a return value for the modification if the function is defined
 * on the current value otherwise it returns a default value. This is a more
 * powerful version of `updateSome`.
 */
export function modifySome_<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, A>,
  def: B,
  pf: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
): Effect<RA & RB, EA | EB, B> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.modifySome_(_, def, pf, __trace)
    },
    (_) => modify_(_, (v) => O.getOrElse_(pf(v), () => Tp.tuple(def, v)), __trace)
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function, which
 * computes a return value for the modification if the function is defined
 * on the current value otherwise it returns a default value. This is a more
 * powerful version of `updateSome`.
 *
 * @ets_data_first modifySome_
 */
export function modifySome<A, B>(
  def: B,
  pf: (a: A) => O.Option<Tp.Tuple<[B, A]>>,
  __trace?: string
) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, B> => modifySome_(self, def, pf, __trace)
}
