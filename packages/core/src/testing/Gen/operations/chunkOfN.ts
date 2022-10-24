import * as Chunk from "@fp-ts/data/Chunk"

/**
 * A generator of chunks of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOfN
 * @tsplus static effect/core/testing/Gen.Aspects chunkOfN
 * @tsplus pipeable effect/core/testing/Gen chunkOfN
 * @category mutations
 * @since 1.0.0
 */
export function chunkOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, Chunk.Chunk<A>> => self.listOfN(n).map(Chunk.fromIterable)
}
