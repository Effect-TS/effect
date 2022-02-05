// ets_tracing: off

import { catchAll_ } from "./catchAll.js"
import type { Stream } from "./definitions.js"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElse_<R, R1, E, E1, O, O1>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E1, O | O1> {
  return catchAll_(self, (_) => that)
}

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElse<R1, E1, O1>(that: Stream<R1, E1, O1>) {
  return <R, E, O>(self: Stream<R, E, O>) => orElse_(self, that)
}
