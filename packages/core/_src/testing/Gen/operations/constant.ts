/**
 * A constant generator of the specified value.
 *
 * @tsplus static effect/core/testing/Gen.Ops constant
 */
export function constant<A>(a: A): Gen<never, A> {
  return Gen(Stream.sync(Maybe.some(Sample.noShrink(a))))
}
