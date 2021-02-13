import { failureOrCause } from "../Cause"
import { fold } from "../Either"
import { pipe } from "../Function"
import { fork, halt } from "./core"
import type { Effect, RIO } from "./effect"
import { onError_ } from "./onExit"

/**
 * Like fork but handles an error with the provided handler.
 */
export function forkWithErrorHandler<R2, E>(handler: (e: E) => RIO<R2, void>) {
  return <R, A>(self: Effect<R, E, A>) => forkWithErrorHandler_(self, handler)
}

/**
 * Like fork but handles an error with the provided handler.
 */
export function forkWithErrorHandler_<R, R2, E, A>(
  self: Effect<R, E, A>,
  handler: (e: E) => RIO<R2, void>
) {
  return fork(onError_(self, (x) => pipe(x, failureOrCause, fold(handler, halt))))
}
