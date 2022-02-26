import { Tuple } from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 *
 * @tsplus fluent ets/XRef updateAndGet
 */
export function updateAndGet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.updateAndGet(f)
    },
    (_) =>
      (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => {
        const result = f(v)
        return Tuple(result, result)
      })
  )
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.updateAndGet(f)
}
