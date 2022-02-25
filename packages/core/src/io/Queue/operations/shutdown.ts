import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Interrupts any fibers that are suspended on `offer` or `take`.
 * Future calls to `offer*` and `take*` will be interrupted immediately.
 *
 * @tsplus fluent ets/Queue shutdown
 * @tsplus fluent ets/XQueue shutdown
 * @tsplus fluent ets/Dequeue shutdown
 * @tsplus fluent ets/XDequeue shutdown
 * @tsplus fluent ets/Enqueue shutdown
 * @tsplus fluent ets/XEnqueue shutdown
 */
export function shutdown<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): UIO<void> {
  concreteQueue(self)
  return self._shutdown
}
