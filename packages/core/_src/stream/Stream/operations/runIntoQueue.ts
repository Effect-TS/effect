/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @tsplus fluent ets/Stream runIntoQueue
 */
export function runIntoQueue_<R, E extends E1, A, E1>(
  self: Stream<R, E, A>,
  queue: LazyArg<Enqueue<Take<E1, A>>>,
  __tsplusTrace?: string
): Effect<R, E | E1, void> {
  return Effect.scoped(self.runIntoQueueScoped(queue));
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @tsplus static ets/Stream/Aspects runIntoQueue
 */
export const runIntoQueue = Pipeable(runIntoQueue_);
