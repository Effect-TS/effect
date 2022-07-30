/**
 * Like fork but handles an error with the provided handler.
 *
 * @tsplus static effect/core/io/Effect.Aspects forkWithErrorHandler
 * @tsplus pipeable effect/core/io/Effect forkWithErrorHandler
 */
export function forkWithErrorHandler<E, X>(
  handler: (e: E) => Effect<never, never, X>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, never, Fiber.Runtime<E, A>> =>
    self
      .onError((cause) => cause.failureOrCause.fold(handler, Effect.failCause))
      .fork
}
