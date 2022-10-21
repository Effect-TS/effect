/**
 * A sized generator of non-empty sets.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOf1
 * @tsplus getter effect/core/testing/Gen setOf1
 */
export function setOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, HashSet<A>> {
  return Gen.small((n) => self.setOfN(n), 1)
}
