/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus static effect/core/stream/Stream.Aspects toQueueDropping
 * @tsplus pipeable effect/core/stream/Stream toQueueDropping
 */
export function toQueueDropping(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Dequeue<Take<E, A>>> =>
    Effect.acquireRelease(
      Queue.dropping<Take<E, A>>(capacity),
      (queue) => queue.shutdown
    ).tap((queue) => self.runIntoQueueScoped(queue).fork)
}
