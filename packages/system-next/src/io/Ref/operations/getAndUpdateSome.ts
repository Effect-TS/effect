import * as Tp from "../../../collection/immutable/Tuple"
import * as O from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import * as A from "../Atomic/operations/getAndUpdateSome"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 */
export function getAndUpdateSome_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<A>,
  __trace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.getAndUpdateSome_(_, pf)
    },
    (_) =>
      modify_(_, (v) => {
        const result = O.getOrElse_(pf(v), () => v)
        return Tp.tuple(v, result)
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
export function getAndUpdateSome<A>(pf: (a: A) => O.Option<A>, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => getAndUpdateSome_(self, pf, __trace)
}
