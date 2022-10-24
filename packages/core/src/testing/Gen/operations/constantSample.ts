/**
 * A constant generator of the specified sample.
 *
 * @tsplus static effect/core/testing/Sample.Ops constantSample
 * @category constructors
 * @since 1.0.0
 */
export function constantSample<R, A>(sample: Sample<R, A>): Gen<R, A> {
  return Gen.fromEffectSample(Effect.succeed(sample))
}
