import type { List } from "@fp-ts/data/List"

/**
 * @tsplus static effect/core/testing/Gen.Ops listOf
 * @tsplus getter effect/core/testing/Gen listOf
 * @category mutations
 * @since 1.0.0
 */
export function listOf<R, A>(self: Gen<R, A>): Gen<R | Sized, List<A>> {
  return Gen.small((n) => self.listOfN(n))
}
