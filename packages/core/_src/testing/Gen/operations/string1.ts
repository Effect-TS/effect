/**
 * @tsplus static effect/core/testing/Gen.Ops string1
 * @tsplus getter effect/core/testing/Gen string1
 */
export function string1<R>(char: Gen<R, string>): Gen<R | Sized, string> {
  return char.chunkOf1.map((chunk) => chunk.join(""))
}
