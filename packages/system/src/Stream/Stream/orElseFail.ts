// ets_tracing: off

import type { Stream } from "./definitions.js"
import { fail } from "./fail.js"
import { orElse_ } from "./orElse.js"

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseFail_<R, E, O, E1>(self: Stream<R, E, O>, e: E1) {
  return orElse_(self, fail(e))
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseFail<R, E, O, E1>(e: E1) {
  return (self: Stream<R, E, O>) => orElseFail_(self, e)
}
