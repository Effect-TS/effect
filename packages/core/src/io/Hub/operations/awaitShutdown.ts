import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Waits for the hub to be shut down.
 *
 * @tsplus fluent ets/XHub awaitShutdown
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): UIO<void> {
  concreteHub(self)
  return self._awaitShutdown
}
