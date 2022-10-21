/**
 * A generator of chunks of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops chunkOfN
 * @tsplus static effect/core/testing/Gen.Aspects chunkOfN
 * @tsplus pipeable effect/core/testing/Gen chunkOfN
 */
export function chunkOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, Chunk<A>> => self.listOfN(n).map(Chunk.from)
}
