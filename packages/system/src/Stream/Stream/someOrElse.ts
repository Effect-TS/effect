// ets_tracing: off

import * as O from "../../Option/index.js"
import type { Stream } from "./definitions.js"
import { map_ } from "./map.js"

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse_<R, E, O2>(
  self: Stream<R, E, O.Option<O2>>,
  default_: () => O2
): Stream<R, E, O2> {
  return map_(self, O.getOrElse(default_))
}

/**
 * Extracts the optional value, or returns the given 'default'.
 */
export function someOrElse<O2>(default_: () => O2) {
  return <R, E>(self: Stream<R, E, O.Option<O2>>) => someOrElse_(self, default_)
}
