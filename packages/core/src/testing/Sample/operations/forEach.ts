/**
 * @tsplus static effect/core/testing/Sample.Aspects forEach
 * @tsplus pipeable effect/core/testing/Sample forEach
 */
export function forEach<A, R2, B>(f: (a: A) => Effect<R2, never, B>) {
  return <R>(self: Sample<R, A>): Effect<R | R2, never, Sample<R | R2, B>> =>
    f(self.value).map((b) =>
      Sample(
        b,
        self.shrink.mapEffect((maybe) =>
          Effect.forEachMaybe(
            maybe,
            (sample) => sample.forEach(f)
          )
        )
      )
    )
}
