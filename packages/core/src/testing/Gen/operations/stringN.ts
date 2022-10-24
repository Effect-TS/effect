import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/testing/Gen.Ops stringN
 * @tsplus static effect/core/testing/Gen.Aspects stringN
 * @tsplus pipeable effect/core/testing/Gen stringN
 * @category constructors
 * @since 1.0.0
 */
export function stringN(n: number) {
  return <R>(char: Gen<R, string>): Gen<R, string> => char.chunkOfN(n).map(Chunk.join(""))
}
