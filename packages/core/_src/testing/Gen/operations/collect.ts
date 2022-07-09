/**
 * Maps the values produced by this generator with the specified partial
 * function, discarding any values the partial function is not defined at.
 *
 * @tsplus static effect/core/testing/Gen.Aspects collect
 * @tsplus pipeable effect/core/testing/Gen collect
 */
export function collect<A, B>(pf: (a: A) => Maybe<B>) {
  return <R>(self: Gen<R, A>): Gen<R, B> =>
    self.flatMap(
      (a) => pf(a).map(Gen.constant).getOrElse(Gen.empty)
    )
}
