import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/getAndUpdateSome"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __etsTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.getAndUpdateSome_(_, pf)
    },
    (_) =>
      modify_(_, (v) => {
        const result = pf(v).getOrElse(v)
        return Tuple(v, result)
      })
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(pf: (a: A) => Option<A>, __etsTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => getAndUpdateSome_(self, pf)
}
