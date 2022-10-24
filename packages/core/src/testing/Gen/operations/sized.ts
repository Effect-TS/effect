/**
 * A sized generator, whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops sized
 * @category constructors
 * @since 1.0.0
 */
export function sized<R, A>(f: (n: number) => Gen<R, A>): Gen<R | Sized, A> {
  return Gen.size.flatMap(f)
}
