import type { HashSet } from "@fp-ts/data/HashSet"

/**
 * A sized generator of sets.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOf
 * @tsplus getter effect/core/testing/Gen setOf
 * @category constructors
 * @since 1.0.0
 */
export function setOf<R, A>(self: Gen<R, A>): Gen<R | Sized, HashSet<A>> {
  return Gen.small((n) => self.setOfN(n))
}
