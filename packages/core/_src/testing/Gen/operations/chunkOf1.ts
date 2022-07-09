/**
 * A sized generator of non-empty chunks.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOf1
 * @tsplus getter effect/core/testing/Gen chunkOf1
 */
export function chunkOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, Chunk<A>> {
  return self.listOf1.map(Chunk.from)
}
