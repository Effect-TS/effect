/**
 * @tsplus static effect/core/testing/Gen.Ops either
 */
export function either<R, A, R2, A2>(
  left: Gen<R, A>,
  right: Gen<R2, A2>
): Gen<R | R2, Either<A, A2>> {
  return Gen.oneOf(left.map(Either.left), right.map(Either.right))
}
