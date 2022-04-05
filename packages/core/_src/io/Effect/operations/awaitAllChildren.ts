/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @tsplus fluent ets/Effect awaitAllChildren
 */
export function awaitAllChildren<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.ensuringChildren((fibers) => Fiber.awaitAll(fibers));
}
