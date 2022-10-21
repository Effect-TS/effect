/**
 * @tsplus static effect/core/testing/Gen.Ops string
 * @tsplus getter effect/core/testing/Gen string
 */
export function string<R>(char: Gen<R, string>): Gen<R | Sized, string> {
  return char.chunkOf.map((chunk) => chunk.join(""))
}
