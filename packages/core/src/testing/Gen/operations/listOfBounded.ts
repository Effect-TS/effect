import type { List } from "@fp-ts/data/List"

/**
 * A generator of lists whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops listOfBounded
 * @tsplus static effect/core/testing/Gen.Aspects listOfBounded
 * @tsplus pipeable effect/core/testing/Gen listOfBounded
 * @category mutations
 * @since 1.0.0
 */
export function listOfBounded(min: number, max: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, List<A>> =>
    Gen.bounded(
      min,
      max,
      (n) => self.listOfN(n)
    )
}
