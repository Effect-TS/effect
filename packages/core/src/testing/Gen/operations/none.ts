import * as Option from "@fp-ts/data/Option"

/**
 * A constant generator of the empty value.
 *
 * @tsplus static effect/core/testing/Gen.Ops none
 * @category constructors
 * @since 1.0.0
 */
export const none: Gen<never, Option.Option<never>> = Gen.constant(Option.none)
