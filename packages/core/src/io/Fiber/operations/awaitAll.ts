import type { UIO } from "../../Effect"
import { Fiber } from "../definition"

/**
 * Awaits on all fibers to be completed, successfully or not.
 *
 * @tsplus static ets/FiberOps awaitAll
 */
export function awaitAll(
  fibers: Iterable<Fiber<any, any>>,
  __tsplusTrace?: string
): UIO<void> {
  return Fiber.collectAll(fibers).await().asUnit()
}
