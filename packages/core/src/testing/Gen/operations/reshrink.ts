import * as Option from "@fp-ts/data/Option"

/**
 * Discards the shrinker for this generator and applies a new shrinker by
 * mapping each value to a sample using the specified function. This is useful
 * when the process to shrink a value is simpler than the process used to
 * generate it.
 *
 * @tsplus static effect/core/testing/Gen.Aspects reshrink
 * @tsplus pipeable effect/core/testing/Gen reshrink
 * @category mutations
 * @since 1.0.0
 */
export function reshrink<R2, A, B>(f: (a: A) => Sample<R2, B>) {
  return <R>(self: Gen<R, A>): Gen<R | R2, B> =>
    Gen(
      self.sample.map(Option.map((sample) => f(sample.value))) as Stream<
        R | R2,
        never,
        Option.Option<Sample<R | R2, B>>
      >
    )
}
