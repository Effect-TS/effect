/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueueDropping
 */
export function toQueueDropping_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Effect<R & HasScope, never, Dequeue<Take<E, A>>> {
  return Effect.acquireRelease(
    Queue.dropping<Take<E, A>>(capacity),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueScoped(queue).fork());
}

/**
 * Converts the stream to a sliding scoped queue of chunks. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus static ets/Stream/Aspects toQueueDropping
 */
export const toQueueDropping = Pipeable(toQueueDropping_);
