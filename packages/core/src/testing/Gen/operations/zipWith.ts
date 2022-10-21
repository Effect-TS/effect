/**
 * Composes this generator with the specified generator to create a cartesian
 * product of elements with the specified function.
 *
 * @tsplus static effect/core/testing/Gen.Aspects zipWith
 * @tsplus pipeable effect/core/testing/Gen zipWith
 */
export function zipWith<R2, B, A, C>(that: Gen<R2, B>, f: (a: A, b: B) => C) {
  return <R>(self: Gen<R, A>): Gen<R | R2, C> =>
    self.flatMap(
      a => that.map(b => f(a, b))
    )
}
