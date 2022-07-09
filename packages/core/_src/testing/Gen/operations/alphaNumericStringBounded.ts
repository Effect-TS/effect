/**
 * A generator of alphanumeric strings whose size falls within the specified
 * bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops alphaNumericStringBounded
 */
export function alphaNumericStringBounded(min: number, max: number): Gen<Sized, string> {
  return Gen.alphaNumericChar.stringBounded(min, max)
}
