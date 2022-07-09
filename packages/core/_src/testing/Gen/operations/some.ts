/**
 * @tsplus static effect/core/testing/Gen.Ops some
 * @tsplus getter effect/core/testing/Gen some
 */
export function some<R, A>(self: Gen<R, A>): Gen<R, Maybe<A>> {
  return self.map(Maybe.some)
}
