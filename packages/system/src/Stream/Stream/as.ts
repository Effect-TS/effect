// ets_tracing: off

import type { Stream } from "./definitions.js"
import { map_ } from "./map.js"

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, O, O2>(self: Stream<R, E, O>, o2: O2): Stream<R, E, O2> {
  return map_(self, () => o2)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<O2>(o2: O2) {
  return <R, E, O>(self: Stream<R, E, O>) => map_(self, () => o2)
}
