/**
 * Composes this generator with the specified generator to create a cartesian
 * product of elements.
 *
 * @tsplus pipeable-operator effect/core/testing/Gen &
 * @tsplus static effect/core/testing/Gen.Aspects zip
 * @tsplus pipeable effect/core/testing/Gen zip
 */
export function zip<R2, A2>(that: Gen<R2, A2>) {
  return <R, A>(self: Gen<R, A>): Gen<R | R2, Tuple<[A, A2]>> =>
    self.zipWith(
      that,
      (a, b) => Tuple(a, b)
    )
}
