/**
 * A sized generator, whose size falls within the specified bounds.
 *
 * @tsplus static effect/core/testing/Gen.Ops sized
 */
export function sized<R, A>(f: (n: number) => Gen<R, A>): Gen<R | Sized, A> {
  return Gen.size.flatMap(f)
}
