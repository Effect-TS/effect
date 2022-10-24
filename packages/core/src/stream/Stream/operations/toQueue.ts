/**
 * Converts the stream to a scoped queue of chunks. After the scope is closed,
 * the queue will never again produce values and should be discarded.
 *
 * @tsplus static effect/core/stream/Stream.Aspects toQueue
 * @tsplus pipeable effect/core/stream/Stream toQueue
 * @category destructors
 * @since 1.0.0
 */
export function toQueue(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Dequeue<Take<E, A>>> =>
    Effect.acquireRelease(
      Queue.bounded<Take<E, A>>(capacity),
      (queue) => queue.shutdown
    ).tap((queue) => self.runIntoQueueScoped(queue).forkScoped)
}
