/**
 * A generator US-ASCII strings. Shrinks towards the empty string.
 *
 * @tsplus static effect/core/testing/Gen.Ops asciiString
 */
export const asciiString: Gen<Sized, string> = Gen.string(Gen.asciiChar)
