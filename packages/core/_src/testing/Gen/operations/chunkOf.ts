/**
 * A sized generator of chunks.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOf
 * @tsplus getter effect/core/testing/Gen chunkOf
 */
export function chunkOf<R, A>(self: Gen<R, A>): Gen<R | Sized, Chunk<A>> {
  return self.listOf.map(Chunk.from)
}
