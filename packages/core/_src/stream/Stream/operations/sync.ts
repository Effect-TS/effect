/**
 * Creates a single-valued pure stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops sync
 */
export function sync<A>(a: LazyArg<A>): Stream<never, never, A> {
  return Stream.suspend(Stream.fromChunk(Chunk.single(a())))
}
