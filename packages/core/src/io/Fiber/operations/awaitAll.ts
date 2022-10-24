/**
 * Awaits on all fibers to be completed, successfully or not.
 *
 * @tsplus static effect/core/io/Fiber.Ops awaitAll
 * @category destructors
 * @since 1.0.0
 */
export function awaitAll(
  fibers: Iterable<Fiber<any, any>>
): Effect<never, never, void> {
  return Fiber.collectAll(fibers).await.unit
}
