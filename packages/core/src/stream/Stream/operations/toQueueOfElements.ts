import type { Option } from "../../../data/Option"
import type { Exit } from "../../../io/Exit"
import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { Stream } from "../../Stream"

/**
 * Converts the stream to a managed queue of elements. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueueOfElements
 */
export function toQueueOfElements_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Managed<R, never, Dequeue<Exit<Option<E>, A>>> {
  return Queue.bounded<Exit<Option<E>, A>>(capacity)
    .toManagedWith((queue) => queue.shutdown())
    .tap((queue) => self.runIntoQueueElementsManaged(queue).fork())
}

/**
 * Converts the stream to a managed queue of elements. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export const toQueueOfElements = Pipeable(toQueueOfElements_)
