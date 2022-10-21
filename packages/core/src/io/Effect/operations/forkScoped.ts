/**
 * Forks the fiber in a `Scope`, interrupting it when the scope is closed.
 *
 * @tsplus getter effect/core/io/Effect forkScoped
 */
export function forkScoped<R, E, A>(
  self: Effect<R, E, A>
): Effect<R | Scope, never, Fiber.Runtime<E, A>> {
  return Effect.uninterruptibleMask(({ restore }) =>
    Effect.scopeWith((scope) =>
      scope.fork.flatMap((child) =>
        restore(self).onExit((e) => child.close(e)).forkDaemon.tap((fiber) =>
          child.addFinalizer(
            Effect.fiberIdWith((fiberId) => fiberId == fiber.id ? Effect.unit : fiber.interrupt)
          )
        )
      )
    )
  )
}
