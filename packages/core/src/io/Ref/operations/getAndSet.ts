import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils/common"
import type { Effect } from "../../Effect"
import * as A from "../Atomic/operations/getAndSet"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import { modify_ } from "./modify"

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  value: A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.getAndSet_(_, value)
    },
    (_) => modify_(_, (a) => Tuple(value, a))
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
  ): Effect<RA & RB, EA | EB, A> => getAndSet_(self, value)
}
