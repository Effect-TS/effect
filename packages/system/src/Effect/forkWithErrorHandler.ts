// ets_tracing: off

import { failureOrCause } from "../Cause/index.js"
import { fold } from "../Either/index.js"
import { pipe } from "../Function/index.js"
import { fork, halt } from "./core.js"
import type { Effect, RIO } from "./effect.js"
import { onError_ } from "./onExit.js"

/**
 * Like fork but handles an error with the provided handler.
 *
 * @ets_data_first forkWithErrorHandler_
 */
export function forkWithErrorHandler<R2, E>(
  handler: (e: E) => RIO<R2, void>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => forkWithErrorHandler_(self, handler, __trace)
}

/**
 * Like fork but handles an error with the provided handler.
 */
export function forkWithErrorHandler_<R, R2, E, A>(
  self: Effect<R, E, A>,
  handler: (e: E) => RIO<R2, void>,
  __trace?: string
) {
  return fork(
    onError_(self, (x) => pipe(x, failureOrCause, fold(handler, halt))),
    __trace
  )
}
