/**
 * Submerges the Collections carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @tsplus getter effect/core/stream/Stream flattenCollection
 */
export function flattenCollection<R, E, A>(
  self: Stream<R, E, Collection<A>>
): Stream<R, E, A> {
  return self.map((a) => Chunk.from(a)).unchunks
}
