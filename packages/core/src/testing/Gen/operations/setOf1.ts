import type { HashSet } from "@fp-ts/data/HashSet"

/**
 * A sized generator of non-empty sets.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOf1
 * @tsplus getter effect/core/testing/Gen setOf1
 * @category constructors
 * @since 1.0.0
 */
export function setOf1<R, A>(self: Gen<R, A>): Gen<R | Sized, HashSet<A>> {
  return Gen.small((n) => self.setOfN(n), 1)
}
