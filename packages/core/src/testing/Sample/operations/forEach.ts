/**
 * @tsplus static effect/core/testing/Sample.Aspects forEach
 * @tsplus pipeable effect/core/testing/Sample forEach
 * @category traversing
 * @since 1.0.0
 */
export function forEach<A, R2, B>(f: (a: A) => Effect<R2, never, B>) {
  return <R>(self: Sample<R, A>): Effect<R | R2, never, Sample<R | R2, B>> =>
    f(self.value).map((b) =>
      Sample(
        b,
        self.shrink.mapEffect((option) =>
          Effect.forEachOption(option, (sample) => sample.forEach(f))
        )
      )
    )
}
