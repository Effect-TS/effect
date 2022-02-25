import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Whether or not the queue is shutdown. Will be `true` if `shutdown` has
 * been called.
 *
 * @tsplus fluent ets/Queue isShutdown
 * @tsplus fluent ets/XQueue isShutdown
 * @tsplus fluent ets/Dequeue isShutdown
 * @tsplus fluent ets/XDequeue isShutdown
 * @tsplus fluent ets/Enqueue isShutdown
 * @tsplus fluent ets/XEnqueue isShutdown
 */
export function isShutdown<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): UIO<boolean> {
  concreteQueue(self)
  return self._isShutdown
}
