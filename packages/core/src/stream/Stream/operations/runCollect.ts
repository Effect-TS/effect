import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Runs the stream and collects all of its elements to a chunk.
 *
 * @tsplus getter effect/core/stream/Stream runCollect
 * @tsplus static effect/core/stream/Stream.Aspects runCollect
 * @category destructors
 * @since 1.0.0
 */
export function runCollect<R, E, A>(
  self: Stream<R, E, A>
): Effect<R, E, Chunk<A>> {
  return self.run(Sink.collectAll())
}
