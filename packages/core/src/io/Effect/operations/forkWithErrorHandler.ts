/**
 * Like fork but handles an error with the provided handler.
 *
 * @tsplus static effect/core/io/Effect.Aspects forkWithErrorHandler
 * @tsplus pipeable effect/core/io/Effect forkWithErrorHandler
 * @category forking
 * @since 1.0.0
 */
export function forkWithErrorHandler<E, X>(handler: (e: E) => Effect<never, never, X>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, never, Fiber.Runtime<E, A>> =>
    self.onError((cause) => {
      const either = cause.failureOrCause
      switch (either._tag) {
        case "Left": {
          return handler(either.left)
        }
        case "Right": {
          return Effect.failCause(either.right)
        }
      }
    }).fork
}
