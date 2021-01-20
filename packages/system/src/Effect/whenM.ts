import { asUnit } from "./asUnit"
import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM_<R1, E1, A, R, E>(
  self: Effect<R1, E1, A>,
  predicate: Effect<R, E, boolean>
) {
  return chain_(predicate, (a) => (a ? asUnit(self) : unit))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM<R, E>(predicate: Effect<R, E, boolean>) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => whenM_(self, predicate)
}
