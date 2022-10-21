/**
 * @tsplus static effect/core/testing/Gen.Aspects map
 * @tsplus pipeable effect/core/testing/Gen map
 */
export function map<A, B>(f: (a: A) => B) {
  return <R>(self: Gen<R, A>): Gen<R, B> =>
    Gen(self.sample.map(
      (maybe) => maybe.map((sample) => sample.map(f))
    ))
}
