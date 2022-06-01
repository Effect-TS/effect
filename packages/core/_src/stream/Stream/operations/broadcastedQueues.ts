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
): Effect<R | Scope, never, Chunk<Dequeue<Take<E, A>>>> {
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
 *
 * @tsplus static ets/Stream/Aspects broadcastedQueues
 */
export const broadcastedQueues = Pipeable(broadcastedQueues_)
