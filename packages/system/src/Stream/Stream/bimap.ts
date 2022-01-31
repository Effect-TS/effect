// ets_tracing: off

import type { Stream } from "./definitions.js"
import { map_ } from "./map.js"
import { mapError_ } from "./mapError.js"

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, E1, O, O1>(
  self: Stream<R, E, O>,
  f: (e: E) => E1,
  g: (o: O) => O1
): Stream<R, E1, O1> {
  return map_(mapError_(self, f), g)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, E1, O, O1>(f: (e: E) => E1, g: (o: O) => O1) {
  return <R>(self: Stream<R, E, O>) => bimap_(self, f, g)
}
