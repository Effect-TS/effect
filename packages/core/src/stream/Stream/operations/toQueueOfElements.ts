import type { Option } from "@fp-ts/data/Option"

/**
 * Converts the stream to a scoped queue of elements. After the scope is
 * closed, the queue will never again produce values and should be discarded.
 *
 * @tsplus static effect/core/stream/Stream.Aspects toQueueOfElements
 * @tsplus pipeable effect/core/stream/Stream toQueueOfElements
 * @category destructors
 * @since 1.0.0
 */
export function toQueueOfElements(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Dequeue<Exit<Option<E>, A>>> =>
    Effect.acquireRelease(
      Queue.bounded<Exit<Option<E>, A>>(capacity),
      (queue) => queue.shutdown
    ).tap((queue) => self.runIntoQueueElementsScoped(queue).forkScoped)
}
