/**
 * A constant generator of the empty value.
 *
 * @tsplus static effect/core/testing/Gen.Ops none
 */
export const none: Gen<never, Maybe<never>> = Gen.constant(Maybe.none)
