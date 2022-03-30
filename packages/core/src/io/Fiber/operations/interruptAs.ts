import type { UIO } from "../../Effect"
import { Exit } from "../../Exit"
import type { FiberId } from "../../FiberId"
import { Fiber, realFiber } from "../definition"

/**
 * A fiber that is already interrupted.
 *
 * @tsplus static ets/FiberOps interruptAs
 */
export function interruptAs(fiberId: FiberId): Fiber<never, never> {
  return Fiber.done(Exit.interrupt(fiberId))
}

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 *
 * @tsplus fluent ets/Fiber interruptAs
 * @tsplus fluent ets/RuntimeFiber interruptAs
 */
export function interruptAsNow_<E, A>(
  self: Fiber<E, A>,
  fiberId: FiberId,
  __tsplusTrace?: string
): UIO<Exit<E, A>> {
  realFiber(self)
  return self._interruptAs(fiberId)
}

/**
 * Interrupts the fiber as if interrupted from the specified fiber. If the
 * fiber has already exited, the returned effect will resume immediately.
 * Otherwise, the effect will resume when the fiber exits.
 */
export const interruptAsNow = Pipeable(interruptAsNow_)
