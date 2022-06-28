/**
 * Forks the effect in the specified scope. The fiber will be interrupted
 * when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Aspects forkIn
 * @tsplus pipeable effect/core/io/Effect forkIn
 */
export function forkIn_<R, E, A>(
  self: Effect<R, E, A>,
  scope: LazyArg<Scope>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, never, Fiber.Runtime<E, A>> =>
    Effect.uninterruptibleMask(({ restore }) =>
      restore(self)
        .forkDaemon
        .tap((fiber) => scope().addFinalizer(fiber.interrupt))
    )
}
