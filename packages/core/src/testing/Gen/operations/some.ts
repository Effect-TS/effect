import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Gen.Ops some
 * @tsplus getter effect/core/testing/Gen some
 * @category constructors
 * @since 1.0.0
 */
export function some<R, A>(self: Gen<R, A>): Gen<R, Option.Option<A>> {
  return self.map(Option.some)
}
