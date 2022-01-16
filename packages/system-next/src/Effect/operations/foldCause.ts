// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Effect, RIO } from "../definition"
import { foldCauseEffect_ } from "./foldCauseEffect"
import { succeedNow } from "./succeedNow"

/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 */
export function foldCause_<R, E, A, A2, A3>(
  self: Effect<R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __trace?: string
): RIO<R, A2 | A3> {
  return foldCauseEffect_(
    self,
    (c) => succeedNow(failure(c)),
    (a) => succeedNow(success(a)),
    __trace
  )
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of
 * failure except interruptions.
 *
 * @ets_data_first foldCause_
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): RIO<R, A2 | A3> =>
    foldCause_(self, failure, success, __trace)
}
