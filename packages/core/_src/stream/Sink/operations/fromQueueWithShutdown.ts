/**
 * Create a sink which enqueues each element into the specified queue. The
 * queue will be shutdown once the stream is closed.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromQueueWithShutdown
 */
export function fromQueueWithShutdown<In>(queue: Enqueue<In>): Sink<never, never, In, never, void> {
  return Sink.unwrapScoped(
    Effect.acquireRelease(Effect.succeed(queue), (q) => q.shutdown).map((q) => Sink.fromQueue(q))
  )
}
