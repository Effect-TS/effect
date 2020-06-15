import { asUnit as effectAsUnit } from "../Effect/asUnit"
import { forkDaemon as effectForkDaemon } from "../Effect/uninterruptibleMask"

import { Fiber } from "./fiber"
import { interrupt } from "./interrupt"

/**
 * Interrupts the fiber from whichever fiber is calling this method. The
 * interruption will happen in a separate daemon fiber, and the returned
 * effect will always resume immediately without waiting.
 */
export const interruptFork = <E, A>(fiber: Fiber<E, A>) =>
  effectAsUnit(effectForkDaemon(interrupt(fiber)))
