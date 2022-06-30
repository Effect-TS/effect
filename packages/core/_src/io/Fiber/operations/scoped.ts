/**
 * Converts this fiber into a scoped effect. The fiber is interrupted when the
 * scope is closed.
 *
 * @tsplus getter effect/core/io/Fiber scoped
 * @tsplus getter effect/core/io/RuntimeFiber scoped
 */
export function scoped<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect<Scope, never, Fiber<E, A>> {
  return Effect.acquireRelease(Effect.succeedNow(self), (fiber) => fiber.interrupt)
}
