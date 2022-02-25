import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/updateSome"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, void> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.updateSome_(_, pf)
    },
    (_) => modify_(_, (v) => Tuple(undefined, pf(v).getOrElse(v)))
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(pf: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => updateSome_(self, pf)
}
