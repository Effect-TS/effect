import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Dequeue } from "../../../io/Queue"
import { Queue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
import type { Stream } from "../../Stream"

/**
 * Converts the stream to a scoped queue of elements. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueueOfElements
 */
export function toQueueOfElements_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Dequeue<Exit<Option<E>, A>>> {
  return Effect.acquireRelease(
    Queue.bounded<Exit<Option<E>, A>>(capacity),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueElementsScoped(queue).fork())
}

/**
 * Converts the stream to a scoped queue of elements. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 */
export const toQueueOfElements = Pipeable(toQueueOfElements_)
