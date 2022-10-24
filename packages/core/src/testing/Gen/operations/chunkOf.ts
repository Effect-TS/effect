import * as Chunk from "@fp-ts/data/Chunk"

/**
 * A sized generator of chunks.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOf
 * @tsplus getter effect/core/testing/Gen chunkOf
 * @category mutations
 * @since 1.0.0
 */
export function chunkOf<R, A>(self: Gen<R, A>): Gen<R | Sized, Chunk.Chunk<A>> {
  return self.listOf.map(Chunk.fromIterable)
}
