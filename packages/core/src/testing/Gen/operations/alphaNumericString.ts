/**
 * A generator of alphanumeric strings. Shrinks towards the empty string.
 *
 * @tsplus static effect/core/testing/Gen.Ops alphaNumericString
 * @category constructors
 * @since 1.0.0
 */
export const alphaNumericString: Gen<Sized, string> = Gen.string(Gen.alphaNumericChar)
