/**
 * Like fork but handles an error with the provided handler.
 *
 * @tsplus fluent ets/Effect forkWithErrorHandler
 */
export function forkWithErrorHandler_<R, E, A, X>(
  self: Effect<R, E, A>,
  handler: (e: E) => Effect.UIO<X>,
  __tsplusTrace?: string
): Effect.RIO<R, Fiber.Runtime<E, A>> {
  return self
    .onError((cause) => cause.failureOrCause().fold(handler, Effect.failCauseNow))
    .fork()
}

/**
 * Like fork but handles an error with the provided handler.
 *
 * @tsplus static ets/Effect/Aspects forkWithErrorHandler
 */
export function forkWithErrorHandler<E, X>(
  handler: (e: E) => Effect.UIO<X>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect.RIO<R, Fiber.Runtime<E, A>> => self.forkWithErrorHandler(handler)
}
