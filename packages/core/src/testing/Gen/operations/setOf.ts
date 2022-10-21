/**
 * A sized generator of sets.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOf
 * @tsplus getter effect/core/testing/Gen setOf
 */
export function setOf<R, A>(self: Gen<R, A>): Gen<R | Sized, HashSet<A>> {
  return Gen.small((n) => self.setOfN(n))
}
