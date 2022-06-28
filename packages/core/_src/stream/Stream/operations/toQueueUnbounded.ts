/**
 * Converts the stream into an unbounded scoped queue. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus getter effect/core/stream/Stream toQueueUnbounded
 */
export function toQueueUnbounded<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R | Scope, never, Dequeue<Take<E, A>>> {
  return Effect.acquireRelease(
    Queue.unbounded<Take<E, A>>(),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueScoped(queue).fork)
}
