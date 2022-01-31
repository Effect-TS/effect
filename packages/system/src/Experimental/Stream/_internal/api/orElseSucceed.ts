// ets_tracing: off

import type * as C from "../core.js"
import * as OrElse from "./orElse.js"
import * as Succeed from "./succeed.js"

/**
 * Succeeds with the specified value if this one fails with a typed error.
 */
export function orElseSucceed_<R, E, A, A1>(
  self: C.Stream<R, E, A>,
  a1: A1
): C.Stream<R, E, A | A1> {
  return OrElse.orElse_(self, Succeed.succeed(a1))
}

/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A1>(a1: A1) {
  return <R, E, A>(self: C.Stream<R, E, A>) => orElseSucceed_(self, a1)
}
