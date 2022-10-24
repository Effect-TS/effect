/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 *
 * @tsplus static effect/core/io/Fiber.Ops joinAll
 * @category destructors
 * @since 1.0.0
 */
export function joinAll<E, A>(fibers: Iterable<Fiber<E, A>>): Effect<never, E, void> {
  return Fiber.collectAll(fibers).join.unit
}
