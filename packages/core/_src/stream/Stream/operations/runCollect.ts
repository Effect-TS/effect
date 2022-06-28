/**
 * Runs the stream and collects all of its elements to a chunk.
 *
 * @tsplus getter effect/core/stream/Stream runCollect
 */
export function runCollect<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return self.run(Sink.collectAll())
}
