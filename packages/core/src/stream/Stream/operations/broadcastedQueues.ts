import { Chunk } from "../../../collection/immutable/Chunk"
import { Hub } from "../../../io/Hub"
import { Managed } from "../../../io/Managed"
import type { Dequeue } from "../../../io/Queue"
import type { Take } from "../../Take"
import type { Stream } from "../definition"

/**
 * Converts the stream to a managed list of queues. Every value will be
 * replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @tsplus fluent ets/Stream broadcastedQueues
 */
export function broadcastedQueues_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  __tsplusTrace?: string
): Managed<R, never, Chunk<Dequeue<Take<E, A>>>> {
  return Managed.Do()
    .bind("hub", () => Hub.bounded<Take<E, A>>(maximumLag).toManaged())
    .bind("queues", ({ hub }) =>
      Managed.collectAll(Chunk.fill(n, () => hub.subscribe()))
    )
    .tap(({ hub }) => self.runIntoHubManaged(hub).fork())
    .map(({ queues }) => queues)
}

/**
 * Converts the stream to a managed list of queues. Every value will be
 * replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export const broadcastedQueues = Pipeable(broadcastedQueues_)
