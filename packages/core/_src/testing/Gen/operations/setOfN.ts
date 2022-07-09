/**
 * A generator of sets of the specified size.
 *
 * @tsplus static effect/core/testing/Gen.Ops setOfN
 * @tsplus static effect/core/testing/Gen.Aspects setOfN
 * @tsplus pipeable effect/core/testing/Gen setOfN
 */
export function setOfN(n: number) {
  return <R, A>(self: Gen<R, A>): Gen<R, HashSet<A>> =>
    Chunk.fill(n, () => self)
      .reduce(
        Gen.constant(HashSet.empty<A>()) as Gen<R, HashSet<A>>,
        (acc, curr) =>
          acc.flatMap((set) =>
            curr.filterNot(
              (a) => set.has(a)
            ).map((elem) => set.add(elem))
          )
      )
}
