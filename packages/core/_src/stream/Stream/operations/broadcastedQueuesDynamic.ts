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
): Effect<R | Scope, never, Effect<Scope, never, Dequeue<Take<E, A>>>> {
  return self.toHub(maximumLag).map((hub) => hub.subscribe)
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will
 * be replicated to every queue with the slowest queue being allowed to buffer
 * `maximumLag` chunks before the driver is back pressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 *
 * @tsplus static ets/Stream/Aspects broadcastedQueuesDynamic
 */
export const broadcastedQueuesDynamic = Pipeable(broadcastedQueuesDynamic_)
