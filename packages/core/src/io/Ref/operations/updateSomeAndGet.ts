import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified partial function. If
 * the function is undefined on the current value it returns the old value
 * without changing it.
 *
 * @tsplus fluent ets/XRef updateSomeAndGet
 */
export function updateSomeAndGet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.updateSomeAndGet(pf)
    },
    (_) =>
      (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => {
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
  ): Effect<RA & RB, EA | EB, A> => self.updateSomeAndGet(pf)
}
