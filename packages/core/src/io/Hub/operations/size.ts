import type { UIO } from "../../Effect"
import type { XHub } from "../definition"
import { concreteHub } from "../definition"

/**
 * The current number of messages in the hub.
 *
 * @tsplus getter ets/XHub size
 */
export function size<RA, RB, EA, EB, A, B>(
  self: XHub<RA, RB, EA, EB, A, B>
): UIO<number> {
  concreteHub(self)
  return self._size
}
