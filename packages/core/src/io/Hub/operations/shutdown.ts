import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * Shuts down the hub.
 *
 * @tsplus fluent ets/XHub shutdown
 */
export function shutdown<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): UIO<void> {
  concreteHub(self)
  return self._shutdown
}
