import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/testing/Gen.Ops string1
 * @tsplus getter effect/core/testing/Gen string1
 * @category constructors
 * @since 1.0.0
 */
export function string1<R>(char: Gen<R, string>): Gen<R | Sized, string> {
  return char.chunkOf1.map(Chunk.join(""))
}
