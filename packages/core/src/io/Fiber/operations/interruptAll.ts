import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { Fiber } from "../definition"

/**
 * Interrupts all fibers, awaiting their interruption.
 *
 * @tsplus static ets/FiberOps interruptAll
 */
export function interruptAll(
  fibers: Iterable<Fiber<any, any>>,
  __tsplusTrace?: string
): UIO<void> {
  return Effect.fiberId.flatMap((fiberId) => Fiber.interruptAllAs(fibers, fiberId))
}
