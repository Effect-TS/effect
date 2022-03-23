import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { Stream } from "../../Stream"
import type { Take } from "../../Take"

/**
 * Converts the stream to a managed queue of chunks. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueue
 */
export function toQueue_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Managed<R, never, Dequeue<Take<E, A>>> {
  return Queue.bounded<Take<E, A>>(capacity)
    .toManagedWith((queue) => queue.shutdown())
    .tap((queue) => self.runIntoQueueManaged(queue).fork())
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export const toQueue = Pipeable(toQueue_)
