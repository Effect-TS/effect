import * as E from "../../../data/Either"
import { failureOrCause } from "../../Cause"
import type * as Fiber from "../../Fiber"
import type { Effect, RIO, UIO } from "../definition"
import { failCause } from "./failCause"
import { fork } from "./fork"
import { onError_ } from "./onError"

/**
 * Like fork but handles an error with the provided handler.
 *
 * @ets fluent ets/Effect forkWithErrorHandler
 */
export function forkWithErrorHandler_<R, E, A, X>(
  self: Effect<R, E, A>,
  handler: (e: E) => UIO<X>,
  __etsTrace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return fork(
    onError_(self, (cause) => E.fold_(failureOrCause(cause), handler, failCause))
  )
}

/**
 * Like fork but handles an error with the provided handler.
 *
 * @ets_data_first forkWithErrorHandler_
 */
export function forkWithErrorHandler<E, X>(
  handler: (e: E) => UIO<X>,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): RIO<R, Fiber.Runtime<E, A>> =>
    forkWithErrorHandler_(self, handler)
}
