import * as Option from "@fp-ts/data/Option"

/**
 * A constant generator of the specified value.
 *
 * @tsplus static effect/core/testing/Gen.Ops constant
 * @category constructors
 * @since 1.0.0
 */
export function constant<A>(a: A): Gen<never, A> {
  return Gen(Stream.sync(Option.some(Sample.noShrink(a))))
}
