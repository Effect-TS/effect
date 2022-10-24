import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Submerges the iterables carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @tsplus getter effect/core/stream/Stream flattenIterable
 * @category sequencing
 * @since 1.0.0
 */
export function flattenIterable<R, E, A>(
  self: Stream<R, E, Iterable<A>>
): Stream<R, E, A> {
  return self.map(Chunk.fromIterable).unchunks
}
