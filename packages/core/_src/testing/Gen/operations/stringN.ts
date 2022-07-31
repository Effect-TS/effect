/**
 * @tsplus static effect/core/testing/Gen.Ops stringN
 * @tsplus static effect/core/testing/Gen.Aspects stringN
 * @tsplus pipeable effect/core/testing/Gen stringN
 */
export function stringN(n: number) {
  return <R>(char: Gen<R, string>): Gen<R, string> =>
    char.chunkOfN(n).map((chunk) => chunk.join(""))
}
