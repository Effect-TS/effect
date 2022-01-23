import * as Tp from "../../../collection/immutable/Tuple"
import * as O from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import * as A from "../Atomic/operations/updateSomeAndGet"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 */
export function updateSomeAndGet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => O.Option<A>,
  __trace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.updateSomeAndGet_(_, pf, __trace)
    },
    (_) =>
      modify_(
        _,
        (v) => {
          const result = O.getOrElse_(pf(v), () => v)
          return Tp.tuple(result, result)
        },
        __trace
      )
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 *
 * @ets_data_first updateSomeAndGet_
 */
export function updateSomeAndGet<A>(pf: (a: A) => O.Option<A>, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => updateSomeAndGet_(self, pf, __trace)
}
