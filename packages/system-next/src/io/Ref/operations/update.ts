import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/update"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified function.
 */
export function update_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __etsTrace?: string
): Effect<RA & RB, EA | EB, void> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.update_(_, f)
    },
    (_) => modify_(_, (v) => Tuple(undefined, f(v)))
  )
}

/**
 * Atomically modifies the `XRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __etsTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => update_(self, f)
}
