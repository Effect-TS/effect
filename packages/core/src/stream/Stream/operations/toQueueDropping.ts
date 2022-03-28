import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { Stream } from "../../Stream"
import type { Take } from "../../Take"

/**
 * Converts the stream to a dropping managed queue of chunks. After the
 * managed queue is used, the queue will never again produce values and should
 * be discarded.
 *
 * @tsplus fluent ets/Stream toQueueDropping
 */
export function toQueueDropping_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Managed<R, never, Dequeue<Take<E, A>>> {
  return Queue.dropping<Take<E, A>>(capacity)
    .toManagedWith((queue) => queue.shutdown())
    .tap((queue) => self.runIntoQueueManaged(queue).fork())
}

/**
 * Converts the stream to a dropping managed queue of chunks. After the
 * managed queue is used, the queue will never again produce values and should
 * be discarded.
 */
export const toQueueDropping = Pipeable(toQueueDropping_)
