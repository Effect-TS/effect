import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * The moral equivalent of `if (p) exp`
 */
export function when_<R1, E1, A>(self: Effect<R1, E1, A>, predicate: () => boolean) {
  return predicate() ? map_(self, O.some) : succeed(O.none)
}

/**
 * The moral equivalent of `if (p) exp`
 */
export function when<R, E>(predicate: () => boolean) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => when_(self, predicate)
}
