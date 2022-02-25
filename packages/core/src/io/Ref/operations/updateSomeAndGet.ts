import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/updateSomeAndGet"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.updateSomeAndGet_(_, pf)
    },
    (_) =>
      modify_(_, (v) => {
        const result = pf(v).getOrElse(v)
        return Tuple(result, result)
      })
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(pf: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => updateSomeAndGet_(self, pf)
}
