/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 *
 * @tsplus static ets/Fiber/Ops joinAll
 */
export function joinAll<E>(
  fibers: Collection<Fiber<E, any>>,
  __tsplusTrace?: string
): Effect.IO<E, void> {
  return Fiber.collectAll(fibers).join().asUnit();
}
