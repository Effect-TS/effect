/**
 * Composes this sample with the specified sample to create a cartesian product
 * of values and shrinkings with the specified function.
 *
 * @tsplus static effect/core/testing/Sample.Aspects zipWith
 * @tsplus pipeable effect/core/testing/Sample zipWith
 * @category zipping
 * @since 1.0.0
 */
export function zipWith<R2, B, A, C>(that: Sample<R2, B>, f: (a: A, b: B) => C) {
  return <R>(self: Sample<R, A>): Sample<R | R2, C> =>
    self.flatMap(
      (a) => that.map((b) => f(a, b))
    )
}
