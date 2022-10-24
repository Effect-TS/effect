import * as Chunk from "@fp-ts/data/Chunk"

/**
 * A sized generator of non-empty chunks.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOf1
 * @tsplus getter effect/core/testing/Gen chunkOf1
 * @category mutations
 * @since 1.0.0
 */
export function chunkOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, Chunk.Chunk<A>> {
  return self.listOf1.map(Chunk.fromIterable)
}
