/**
 * Constructs a generator from an effect that constructs a sample.
 *
 * @tsplus static effect/core/testing/Gen.Ops fromEffectSample
 */
export function fromEffectSample<R, A>(effect: Effect<R, never, Sample<R, A>>): Gen<R, A> {
  return Gen(Stream.fromEffect(effect.asSome))
}
