/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus static effect/core/stream/Stream.Aspects toQueueSliding
 * @tsplus pipeable effect/core/stream/Stream toQueueSliding
 * @category destructors
 * @since 1.0.0
 */
export function toQueueSliding(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Dequeue<Take<E, A>>> =>
    Effect.acquireRelease(
      Queue.sliding<Take<E, A>>(capacity),
      (queue) => queue.shutdown
    ).tap((queue) => self.runIntoQueueScoped(queue).forkScoped)
}
