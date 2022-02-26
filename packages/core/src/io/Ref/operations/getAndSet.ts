import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils/common"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 *
 * @tsplus fluent ets/XRef getAndSet
 */
export function getAndSet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  value: A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.getAndSet(value)
    },
    (_) => (_ as XRef<RA, RB, EA, EB, A, A>).modify((a) => Tuple(value, a))
  )
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.getAndSet(value)
}
