import * as O from "../Option"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM_<R1, E1, A, R, E>(
  self: Effect<R1, E1, A>,
  predicate: Effect<R, E, boolean>
) {
  return chain_(predicate, (a) => (a ? map_(self, O.some) : succeed(O.none)))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenM<R, E>(self: Effect<R, E, boolean>) {
  return <R1, E1, A>(predicate: Effect<R1, E1, A>) => whenM_(predicate, self)
}
