/**
 * Fan out the stream, producing a list of streams that have the same elements
 * as this stream. The driver stream will only ever advance the `maximumLag`
 * chunks before the slowest downstream stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects broadcast
 * @tsplus pipeable effect/core/stream/Stream broadcast
 */
export function broadcast(n: number, maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>): Effect<R | Scope, never, Chunk<Stream<never, E, A>>> =>
    self
      .broadcastedQueues(n, maximumLag)
      .map((chunk) => chunk.map((queue) => Stream.fromQueueWithShutdown(queue).flattenTake))
}
