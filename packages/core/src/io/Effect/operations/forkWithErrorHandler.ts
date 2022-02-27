import type { Fiber } from "../../Fiber"
import type { RIO, UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Like fork but handles an error with the provided handler.
 *
 * @tsplus fluent ets/Effect forkWithErrorHandler
 */
export function forkWithErrorHandler_<R, E, A, X>(
  self: Effect<R, E, A>,
  handler: (e: E) => UIO<X>,
  __tsplusTrace?: string
): RIO<R, Fiber.Runtime<E, A>> {
  return self
    .onError((cause) => cause.failureOrCause().fold(handler, Effect.failCauseNow))
    .fork()
}

/**
 * Like fork but handles an error with the provided handler.
 *
 * @ets_data_first forkWithErrorHandler_
 */
export function forkWithErrorHandler<E, X>(
  handler: (e: E) => UIO<X>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): RIO<R, Fiber.Runtime<E, A>> =>
    self.forkWithErrorHandler(handler)
}
