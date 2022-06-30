/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will
 * be replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @tsplus static effect/core/stream/Stream.Aspects broadcastedQueuesDynamic
 * @tsplus pipeable effect/core/stream/Stream broadcastedQueuesDynamic
 */
export function broadcastedQueuesDynamic(maximumLag: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Effect<Scope, never, Dequeue<Take<E, A>>>> =>
    self.toHub(maximumLag).map((hub) => hub.subscribe)
}
