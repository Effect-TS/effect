import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified function, returning the
 * value immediately before modification.
 *
 * @tsplus fluent ets/XRef getAndUpdate
 */
export function getAndUpdate_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.getAndUpdate(f)
    },
    (_) => (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => Tuple(v, f(v)))
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
  ): Effect<RA & RB, EA | EB, A> => self.getAndUpdate(f)
}
