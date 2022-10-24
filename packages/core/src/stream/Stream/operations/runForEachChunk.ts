import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEachChunk
 * @tsplus pipeable effect/core/stream/Stream runForEachChunk
 * @category destructors
 * @since 1.0.0
 */
export function runForEachChunk<A, R2, E2, Z>(
  f: (chunk: Chunk<A>) => Effect<R2, E2, Z>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, void> =>
    self.run(
      Sink.forEachChunk(f)
    )
}
