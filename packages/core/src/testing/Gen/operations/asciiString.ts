/**
 * A generator US-ASCII strings. Shrinks towards the empty string.
 *
 * @tsplus static effect/core/testing/Gen.Ops asciiString
 * @category constructors
 * @since 1.0.0
 */
export const asciiString: Gen<Sized, string> = Gen.string(Gen.asciiChar)
