import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { Stream } from "../../Stream"
import type { Take } from "../../Take"

/**
 * Converts the stream to a sliding managed queue of chunks. After the managed
 * queue is used, the queue will never again produce values and should be
 * discarded.
 *
 * @tsplus fluent ets/Stream toQueueSliding
 */
export function toQueueSliding_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Managed<R, never, Dequeue<Take<E, A>>> {
  return Queue.sliding<Take<E, A>>(capacity)
    .toManagedWith((queue) => queue.shutdown())
    .tap((queue) => self.runIntoQueueManaged(queue).fork())
}

/**
 * Converts the stream to a sliding managed queue of chunks. After the managed
 * queue is used, the queue will never again produce values and should be
 * discarded.
 */
export const toQueueSliding = Pipeable(toQueueSliding_)
