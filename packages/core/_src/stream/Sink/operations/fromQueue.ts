/**
 * Create a sink which enqueues each element into the specified queue.
 *
 * @tsplus static effect/core/stream/Sink.Ops fromQueue
 */
export function fromQueue<In>(queue: Enqueue<In>): Sink<never, never, In, never, void> {
  return Sink.forEachChunk<never, never, In, boolean>((chunk) => queue.offerAll(chunk))
}
