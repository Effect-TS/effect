// ets_tracing: off

import { matchTag_ } from "../../../src/Utils"
import * as Tp from "../../Collections/Immutable/Tuple"
import * as A from "../Atomic/operations/getAndSet"
import type { XRef } from "../definition"
import { concrete } from "../definition"
import type * as T from "./_internal/effect"
import { modify_ } from "./modify"

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 */
export function getAndSet_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  value: A,
  __trace?: string
): T.Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (_) => A.getAndSet_(_, value, __trace)
    },
    (_) => modify_(_, (a) => Tp.tuple(value, a), __trace)
  )
}

/**
 * Atomically writes the specified value to the `XRef`, returning the value
 * immediately before modification.
 *
 * @ets_data_first getAndSet_
 */
export function getAndSet<A>(value: A, __trace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): T.Effect<RA & RB, EA | EB, A> => getAndSet_(self, value, __trace)
}
