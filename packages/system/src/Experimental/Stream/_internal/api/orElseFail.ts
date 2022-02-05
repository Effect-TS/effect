// ets_tracing: off

import type * as C from "../core.js"
import * as Fail from "./fail.js"
import * as OrElse from "./orElse.js"

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 */
export function orElseFail_<R, E, E1, A>(
  self: C.Stream<R, E, A>,
  e1: () => E1
): C.Stream<R, E | E1, A> {
  return OrElse.orElse_(self, Fail.fail(e1()))
}

/**
 * Fails with given error in case this one fails with a typed error.
 *
 * See also `Stream#catchAll`.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E1>(e1: () => E1) {
  return <R, E, A>(self: C.Stream<R, E, A>) => orElseFail_(self, e1)
}
