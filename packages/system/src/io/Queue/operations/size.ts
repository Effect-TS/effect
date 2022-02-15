import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Retrieves the size of the queue, which is equal to the number of elements
 * in the queue. This may be negative if fibers are suspended waiting for
 * elements to be added to the queue.
 *
 * @tsplus getter ets/Queue size
 * @tsplus getter ets/XQueue size
 * @tsplus getter ets/Dequeue size
 * @tsplus getter ets/XDequeue size
 * @tsplus getter ets/Enqueue size
 * @tsplus getter ets/XEnqueue size
 */
export function size<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __etsTrace?: string
): UIO<number> {
  concreteQueue(self)
  return self._size
}
