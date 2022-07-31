/**
 * Converts the stream to a managed list of queues. Every value will be
 * replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @tsplus static effect/core/stream/Stream.Aspects broadcastedQueues
 * @tsplus pipeable effect/core/stream/Stream broadcastedQueues
 */
export function broadcastedQueues(
  n: number,
  maximumLag: number
) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Chunk<Dequeue<Take<E, A>>>> =>
    Do(($) => {
      const hub = $(Hub.bounded<Take<E, A>>(maximumLag))
      const queues = $(Effect.collectAll(Chunk.fill(n, () => hub.subscribe)))
      $(self.runIntoHubScoped(hub).fork)
      return queues
    })
}
