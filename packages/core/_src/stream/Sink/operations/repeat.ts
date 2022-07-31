/**
 * Repeatedly runs the provided sink.
 *
 * @tsplus getter effect/core/stream/Sink repeat
 */
export function repeat<R, E, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, Chunk<Z>> {
  return self.collectAllWhileWith(Chunk.empty<Z>(), () => true, (s, z) => s.append(z))
}
