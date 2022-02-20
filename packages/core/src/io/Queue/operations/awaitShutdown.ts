import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Waits until the queue is shutdown. The `IO` returned by this method will
 * not resume until the queue has been shutdown. If the queue is already
 * shutdown, the `IO` will resume right away.
 *
 * @tsplus fluent ets/Queue awaitShutdown
 * @tsplus fluent ets/XQueue awaitShutdown
 * @tsplus fluent ets/Dequeue awaitShutdown
 * @tsplus fluent ets/XDequeue awaitShutdown
 * @tsplus fluent ets/Enqueue awaitShutdown
 * @tsplus fluent ets/XEnqueue awaitShutdown
 */
export function awaitShutdown<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __etsTrace?: string
): UIO<void> {
  concreteQueue(self)
  return self._awaitShutdown
}
