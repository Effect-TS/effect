// ets_tracing: off

import type * as C from "../core.js"
import * as Map from "./map.js"

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, A, A2>(self: C.Stream<R, E, A>, a2: A2): C.Stream<R, E, A2> {
  return Map.map_(self, (_) => a2)
}

/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<A2>(a2: A2) {
  return <R, E, A>(self: C.Stream<R, E, A>) => as_(self, a2)
}
