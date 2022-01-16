// ets_tracing: off

import { failureOrCause } from "../../Cause"
import * as E from "../../Either"
import type * as Fiber from "../../Fiber"
import type { Effect, RIO, UIO } from "../definition"
import { failCause } from "./failCause"
import { fork } from "./fork"
import { onError_ } from "./onError"

/**
 * Like fork but handles an error with the provided handler.
 */
export function forkWithErrorHandler_<R, E, A, X>(
  self: Effect<R, E, A>,
  handler: (e: E) => UIO<X>,
  __trace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return fork(
    onError_(self, (cause) => E.fold_(failureOrCause(cause), handler, failCause)),
    __trace
  )
}

/**
 * Like fork but handles an error with the provided handler.
 *
 * @ets_data_first forkWithErrorHandler_
 */
export function forkWithErrorHandler<E, X>(
  handler: (e: E) => UIO<X>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): RIO<R, Fiber.Runtime<E, A>> =>
    forkWithErrorHandler_(self, handler, __trace)
}
