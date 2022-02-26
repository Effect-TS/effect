import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified partial function, which
 * computes a return value for the modification if the function is defined
 * on the current value otherwise it returns a default value. This is a more
 * powerful version of `updateSome`.
 *
 * @tsplus fluent ets/XRef modifySome
 */
export function modifySome_<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, A>,
  def: B,
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, B> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.modifySome(def, pf)
    },
    (_) =>
      (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => pf(v).getOrElse(Tuple(def, v)))
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
  pf: (a: A) => Option<Tuple<[B, A]>>,
  __tsplusTrace?: string
) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, B> => self.modifySome(def, pf)
}
