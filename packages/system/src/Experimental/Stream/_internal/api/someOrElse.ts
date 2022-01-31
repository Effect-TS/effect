// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as Map from "./map.js"

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse_<R, E, A>(
  self: C.Stream<R, E, O.Option<A>>,
  default_: A
): C.Stream<R, E, A> {
  return Map.map_(
    self,
    O.getOrElseS(() => default_)
  )
}

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @ets_data_first someOrElse_
 */
export function someOrElse<A>(default_: A) {
  return <R, E>(self: C.Stream<R, E, O.Option<A>>) => someOrElse_(self, default_)
}
