import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Checks whether the queue is currently empty.
 *
 * @tsplus fluent ets/Queue isEmpty
 * @tsplus fluent ets/XQueue isEmpty
 * @tsplus fluent ets/Dequeue isEmpty
 * @tsplus fluent ets/XDequeue isEmpty
 * @tsplus fluent ets/Enqueue isEmpty
 * @tsplus fluent ets/XEnqueue isEmpty
 */
export function isEmpty<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __etsTrace?: string
): UIO<boolean> {
  concreteQueue(self)
  return self._size.map((size) => size === 0)
}
