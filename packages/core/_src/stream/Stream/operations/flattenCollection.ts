/**
 * Submerges the Collections carried by this stream into the stream's structure,
 * while still preserving them.
 *
 * @tsplus fluent ets/Stream flattenCollection
 */
export function flattenCollection<R, E, A>(
  self: Stream<R, E, Collection<A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.map((a) => Chunk.from(a)).unchunks()
}
