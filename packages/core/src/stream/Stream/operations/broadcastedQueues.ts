import { Chunk } from "../../../collection/immutable/Chunk"
import { Effect } from "../../../io/Effect"
import { Hub } from "../../../io/Hub"
import type { Dequeue } from "../../../io/Queue"
import type { HasScope } from "../../../io/Scope"
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
): Effect<R & HasScope, never, Chunk<Dequeue<Take<E, A>>>> {
  return Effect.Do()
    .bind("hub", () => Hub.bounded<Take<E, A>>(maximumLag))
    .bind("queues", ({ hub }) => Effect.collectAll(Chunk.fill(n, () => hub.subscribe)))
    .tap(({ hub }) => self.runIntoHubScoped(hub).fork())
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
