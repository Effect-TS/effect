/**
 * A generator of sets whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOfBounded
 * @tsplus static effect/core/testing/Gen.Aspects setOfBounded
 * @tsplus pipeable effect/core/testing/Gen setOfBounded
 */
export function setOfBounded(min: number, max: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, HashSet<A>> =>
    Gen.bounded(
      min,
      max,
      (n) => self.setOfN(n)
    )
}
