/**
 * Enqueues elements of this stream into a queue. Stream failure and ending
 * will also be signalled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runIntoQueue
 * @tsplus pipeable effect/core/stream/Stream runIntoQueue
 * @category destructors
 * @since 1.0.0
 */
export function runIntoQueue<E1, A>(queue: Enqueue<Take<E1, A>>) {
  return <R, E extends E1>(self: Stream<R, E, A>): Effect<R, E | E1, void> =>
    Effect.scoped(self.runIntoQueueScoped(queue))
}
