import type { UIO } from "../../Effect"
import type { XQueue } from "../definition"
import { concreteQueue } from "../definition"

/**
 * Checks whether the queue is currently full.
 *
 * @tsplus fluent ets/Queue isFull
 * @tsplus fluent ets/XQueue isFull
 * @tsplus fluent ets/Dequeue isFull
 * @tsplus fluent ets/XDequeue isFull
 * @tsplus fluent ets/Enqueue isFull
 * @tsplus fluent ets/XEnqueue isFull
 */
export function isFull<RA, RB, EA, EB, A, B>(
  self: XQueue<RA, RB, EA, EB, A, B>,
  __tsplusTrace?: string
): UIO<boolean> {
  concreteQueue(self)
  return self._size.map((size) => size === self._capacity)
}
