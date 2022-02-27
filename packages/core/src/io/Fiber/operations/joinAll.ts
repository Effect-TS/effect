import type { IO } from "../../Effect"
import { Fiber } from "../definition"

/**
 * Joins all fibers, awaiting their _successful_ completion. Attempting to
 * join a fiber that has erred will result in a catchable error, _if_ that
 * error does not result from interruption.
 *
 * @tsplus static ets/FiberOps joinAll
 */
export function joinAll<E>(
  fibers: Iterable<Fiber<E, any>>,
  __tsplusTrace?: string
): IO<E, void> {
  return Fiber.collectAll(fibers).join().asUnit()
}
