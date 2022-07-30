/**
 * Create a sink which enqueues each element into the specified queue.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromQueue
 */
export function fromQueue<In>(
  queue: LazyArg<Enqueue<In>>,
  __tsplusTrace?: string
): Sink<never, never, In, never, void> {
  return Sink.unwrap(Effect.sync(queue).map((q) => Sink.forEachChunk((chunk) => q.offerAll(chunk))))
}
