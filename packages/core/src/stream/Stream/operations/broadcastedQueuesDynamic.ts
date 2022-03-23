import type { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will
 * be replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @tsplus fluent ets/Stream broadcastedQueuesDynamic
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number,
  __tsplusTrace?: string
): Managed<R, never, Managed<unknown, never, Dequeue<Take<E, A>>>> {
  return self.toHub(maximumLag).map((hub) => hub.subscribe())
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will
 * be replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export const broadcastedQueuesDynamic = Pipeable(broadcastedQueuesDynamic_)
