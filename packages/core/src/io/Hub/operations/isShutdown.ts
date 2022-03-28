import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Checks whether the hub is shut down.
 *
 * @tsplus fluent ets/XHub isShutdown
 */
export function isShutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): UIO<boolean> {
  concreteHub(self)
  return self._isShutdown
}
