/**
 * Create a sink which enqueues each element into the specified queue. The
 * queue will be shutdown once the stream is closed.
 *
 * @tsplus static ets/Sink/Ops fromQueueWithShutdown
 */
export function fromQueueWithShutdown<In>(
  queue: LazyArg<Enqueue<In>>,
  __tsplusTrace?: string
): Sink<never, never, In, never, void> {
  return Sink.unwrapScoped(
    Effect.acquireRelease(Effect.succeed(queue), (queue) => queue.shutdown).map(
      (queue) => Sink.fromQueue(queue)
    )
  )
}
