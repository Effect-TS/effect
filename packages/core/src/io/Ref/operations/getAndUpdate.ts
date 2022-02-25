import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/getAndUpdate"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified function, returning the
 * value immediately before modification.
 */
export function getAndUpdate_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.getAndUpdate_(_, f)
    },
    (_) => modify_(_, (v) => Tuple(v, f(v)))
  )
}

/**
 * Atomically modifies the `XRef` with the specified function, returning the
 * value immediately before modification.
 *
 * @ets_data_first getAndUpdate_
 */
export function getAndUpdate<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => getAndUpdate_(self, f)
}
