/**
 * A generator whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops bounded
 * @category constructors
 * @since 1.0.0
 */
export function bounded<R, A>(
  min: number,
  max: number,
  f: (n: number) => Gen<R, A>
): Gen<R, A> {
  return Gen.int({ min, max }).flatMap(f)
}
