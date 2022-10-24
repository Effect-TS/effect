/**
 * Returns a new effect that will not succeed with its value before first
 * waiting for the end of all child fibers forked by the effect.
 *
 * @tsplus getter effect/core/io/Effect awaitAllChildren
 * @category mutations
 * @since 1.0.0
 */
export function awaitAllChildren<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return self.ensuringChildren((fibers) => Fiber.awaitAll(fibers))
}
