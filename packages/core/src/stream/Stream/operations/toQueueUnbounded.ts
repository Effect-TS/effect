import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Converts the stream into an unbounded managed queue. After the managed
 * queue is used, the queue will never again produce values and should be
 * discarded.
 *
 * @tsplus fluent ets/Stream toQueueUnbounded
 */
export function toQueueUnbounded<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, Dequeue<Take<E, A>>> {
  return Queue.unbounded<Take<E, A>>()
    .toManagedWith((queue) => queue.shutdown())
    .tap((queue) => self.runIntoQueueManaged(queue).fork())
}
