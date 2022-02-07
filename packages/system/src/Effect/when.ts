// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * The moral equivalent of `if (p) exp`
 */
export function when_<R1, E1, A>(
  self: Effect<R1, E1, A>,
  predicate: () => boolean,
  __trace?: string
) {
  return predicate() ? map_(self, O.some, __trace) : succeed(O.none, __trace)
}

/**
 * The moral equivalent of `if (p) exp`
 *
 * @ets_data_first when_
 */
export function when(predicate: () => boolean, __trace?: string) {
  return <R1, E1, A>(self: Effect<R1, E1, A>) => when_(self, predicate, __trace)
}
