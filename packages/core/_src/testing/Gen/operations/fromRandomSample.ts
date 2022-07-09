/**
 * Constructs a generator from a function that uses randomness to produce a
 * sample.
 *
 * @tsplus static effect/core/testing/Gen.Ops fromRandomSample
 */
export function fromRandomSample<R, A>(
  f: (random: Random) => Effect<never, never, Sample<R, A>>
): Gen<R, A> {
  return Gen.fromEffectSample(Effect.randomWith(f))
}
