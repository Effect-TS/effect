import * as Option from "@fp-ts/data/Option"

/**
 * A generator of optional values. Shrinks toward `None`.
 *
 * @tsplus static effect/core/testing/Gen.Ops option
 * @tsplus getter effect/core/testing/Gen option
 * @category constructors
 * @since 1.0.0
 */
export function option<R, A>(self: Gen<R, A>): Gen<R, Option.Option<A>> {
  return Gen.oneOf(Gen.none, self.map(Option.some))
}
