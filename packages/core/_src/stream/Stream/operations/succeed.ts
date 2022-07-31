/**
 * Creates a single-valued pure stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops succeed
 */
export function succeed<A>(
  a: LazyArg<A>
): Stream<never, never, A> {
  return Stream.fromChunk(Chunk.single(a()))
}
