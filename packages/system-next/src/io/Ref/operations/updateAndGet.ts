import * as Tp from "../../../collection/immutable/Tuple"
import { matchTag_ } from "../../../data/Utils"
import * as A from "../Atomic/operations/updateAndGet"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type { Effect } from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 */
export function updateAndGet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  f: (a: A) => A,
  __trace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.updateAndGet_(_, f, __trace)
    },
    (_) =>
      modify_(
        _,
        (v) => {
          const result = f(v)
          return Tp.tuple(result, result)
        },
        __trace
      )
  )
}

/**
 * Atomically modifies the `XRef` with the specified function and returns
 * the updated value.
 *
 * @ets_data_first updateAndGet_
 */
export function updateAndGet<A>(f: (a: A) => A, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => updateAndGet_(self, f, __trace)
}
