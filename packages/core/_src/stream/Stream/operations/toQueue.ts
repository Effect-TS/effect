/**
 * Converts the stream to a scoped queue of chunks. After the scope is closed,
 * the queue will never again produce values and should be discarded.
 *
 * @tsplus fluent ets/Stream toQueue
 */
export function toQueue_<R, E, A>(
  self: Stream<R, E, A>,
  capacity = 2,
  __tsplusTrace?: string
): Effect<R | Scope, never, Dequeue<Take<E, A>>> {
  return Effect.acquireRelease(
    Queue.bounded<Take<E, A>>(capacity),
    (queue) => queue.shutdown
  ).tap((queue) => self.runIntoQueueScoped(queue).fork())
}

/**
 * Converts the stream to a scoped queue of chunks. After the scope is closed,
 * the queue will never again produce values and should be discarded.
 *
 * @tsplus static ets/Stream/Aspects toQueue
 */
export const toQueue = Pipeable(toQueue_)
