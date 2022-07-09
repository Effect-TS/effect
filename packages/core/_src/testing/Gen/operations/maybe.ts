/**
 * A generator of optional values. Shrinks toward `None`.
 *
 * @tsplus static effect/core/testing/Gen.Ops maybe
 * @tsplus getter effect/core/testing/Gen maybe
 */
export function maybe<R, A>(self: Gen<R, A>): Gen<R, Maybe<A>> {
  return Gen.oneOf(Gen.none, self.map(Maybe.some))
}
