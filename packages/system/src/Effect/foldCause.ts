// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { foldCauseM_, succeed } from "./core.js"
import type { Effect, RIO } from "./effect.js"

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 */
export function foldCause_<R, E, A, A2, A3>(
  value: Effect<R, E, A>,
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __trace?: string
): RIO<R, A2 | A3> {
  return foldCauseM_(
    value,
    (c) => succeed(failure(c)),
    (x) => succeed(success(x)),
    __trace
  )
}

/**
 * A more powerful version of `fold` that allows recovering from any kind of failure except interruptions.
 *
 * @ets_data_first foldCause_
 */
export function foldCause<E, A, A2, A3>(
  failure: (cause: Cause<E>) => A2,
  success: (a: A) => A3,
  __trace?: string
) {
  return <R>(value: Effect<R, E, A>): RIO<R, A2 | A3> =>
    foldCause_(value, failure, success, __trace)
}
