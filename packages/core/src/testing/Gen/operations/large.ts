/**
 * A sized generator that uses a uniform distribution of size values. A large
 * number of larger sizes will be generated.
 *
 * @tsplus static effect/core/testing/Gen.Ops large
 * @category constructors
 * @since 1.0.0
 */
export function large<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<R | Sized, A> {
  return Gen.size.flatMap((max) => Gen.int({ min, max })).flatMap(f)
}
