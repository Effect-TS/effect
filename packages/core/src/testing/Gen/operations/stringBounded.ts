/**
 * A generator of strings whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops stringBounded
 * @tsplus static effect/core/testing/Gen.Aspects stringBounded
 * @tsplus pipeable effect/core/testing/Gen stringBounded
 * @category constructors
 * @since 1.0.0
 */
export function stringBounded(min: number, max: number) {
  return <R>(char: Gen<R, string>): Gen<R, string> =>
    Gen.bounded(
      min,
      max,
      (n) => char.stringN(n)
    )
}
