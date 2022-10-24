import * as Chunk from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/testing/Gen.Ops string
 * @tsplus getter effect/core/testing/Gen string
 * @category constructors
 * @since 1.0.0
 */
export function string<R>(char: Gen<R, string>): Gen<R | Sized, string> {
  return char.chunkOf.map(Chunk.join(""))
}
