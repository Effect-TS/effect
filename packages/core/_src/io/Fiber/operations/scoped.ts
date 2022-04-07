/**
 * Converts this fiber into a scoped effect. The fiber is interrupted when the
 * scope is closed.
 *
 * @tsplus fluent ets/Fiber scoped
 * @tsplus fluent ets/RuntimeFiber scoped
 */
export function scoped<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect<Has<Scope>, never, Fiber<E, A>> {
  return Effect.acquireRelease(Effect.succeedNow(self), (fiber) => fiber.interrupt());
}
