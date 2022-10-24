/**
 * Constructs a generator from an effect that constructs a sample.
 *
 * @tsplus static effect/core/testing/Gen.Ops fromEffectSample
 * @category constructors
 * @since 1.0.0
 */
export function fromEffectSample<R, A>(effect: Effect<R, never, Sample<R, A>>): Gen<R, A> {
  return Gen(Stream.fromEffect(effect.asSome))
}
