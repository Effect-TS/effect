import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified function.
 *
 * @tsplus fluent ets/XRef update
 */
export function update_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, void> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.update(f)
    },
    (_) => (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => Tuple(undefined, f(v)))
  )
}

/**
 * Atomically modifies the `XRef` with the specified function.
 *
 * @ets_data_first update_
 */
export function update<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, void> => self.update(f)
}
