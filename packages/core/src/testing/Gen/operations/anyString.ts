/**
 * A generator of strings. Shrinks towards the empty string.
 *
 * @tsplus static effect/core/testing/Gen.Ops anyString
 * @category constructors
 * @since 1.0.0
 */
export const anyString: Gen<Sized, string> = Gen.string(Gen.unicodeChar)
