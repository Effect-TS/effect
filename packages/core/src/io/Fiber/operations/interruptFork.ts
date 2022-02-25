import type { UIO } from "../../Effect"
import type { Fiber } from "../definition"
import { interrupt } from "./interrupt"

/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export function interruptFork<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<void> {
  return interrupt(self).forkDaemon().asUnit()
}
