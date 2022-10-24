import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * A generator of sets of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOfN
 * @tsplus static effect/core/testing/Gen.Aspects setOfN
 * @tsplus pipeable effect/core/testing/Gen setOfN
 * @category constructors
 * @since 1.0.0
 */
export function setOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, HashSet.HashSet<A>> =>
    Array.from({ length: n }, () => self).reduce(
      (acc, curr) =>
        acc.flatMap((set) =>
          curr.filterNot(
            (a) => pipe(set, HashSet.has(a))
          ).map((elem) => pipe(set, HashSet.add(elem)))
        ),
      Gen.constant(HashSet.empty<A>()) as Gen<R, HashSet.HashSet<A>>
    )
}
