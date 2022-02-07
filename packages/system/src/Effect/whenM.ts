// ets_tracing: off

import { asUnit } from "./asUnit.js"
import { chain_, unit } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM_<R1, E1, A, R, E>(
  self: Effect<R1, E1, A>,
  predicate: Effect<R, E, boolean>,
  __trace?: string
) {
  return chain_(predicate, (a) => (a ? asUnit(self, __trace) : unit))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @ets_data_first whenM_
 */
export function whenM<R, E>(predicate: Effect<R, E, boolean>, __trace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => whenM_(self, predicate, __trace)
}
