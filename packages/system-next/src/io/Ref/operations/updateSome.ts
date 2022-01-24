import * as Tp from "../../../collection/immutable/Tuple"
import * as O from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import * as A from "../Atomic/operations/updateSome"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 */
export function updateSome_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<A>,
  __trace?: string
): Effect<RA & RB, EA | EB, void> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.updateSome_(_, pf, __trace)
    },
    (_) =>
      modify_(
        _,
        (v) =>
          Tp.tuple(
            undefined,
            O.getOrElse_(pf(v), () => v)
          ),
        __trace
      )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it doesn't change it.
 *
 * @ets_data_first updateSome_
 */
export function updateSome<A>(pf: (a: A) => O.Option<A>, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => updateSome_(self, pf, __trace)
}
