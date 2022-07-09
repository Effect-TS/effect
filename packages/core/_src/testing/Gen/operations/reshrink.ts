/**
 * Discards the shrinker for this generator and applies a new shrinker by
 * mapping each value to a sample using the specified function. This is useful
 * when the process to shrink a value is simpler than the process used to
 * generate it.
 *
 * @tsplus static effect/core/testing/Gen.Aspects reshrink
 * @tsplus pipeable effect/core/testing/Gen reshrink
 */
export function reshrink<R2, A, B>(f: (a: A) => Sample<R2, B>) {
  return <R>(self: Gen<R, A>): Gen<R | R2, B> =>
    Gen(self.sample.map((maybe) =>
      maybe.map(
        (sample) => f(sample.value)
      )
    ) as Stream<R | R2, never, Maybe<Sample<R | R2, B>>>)
}
