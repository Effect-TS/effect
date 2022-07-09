/**
 * A constant generator of the specified sample.
 *
 * @tsplus static effect/core/testing/Sample.Ops constantSample
 */
export function constantSample<R, A>(sample: Sample<R, A>): Gen<R, A> {
  return Gen.fromEffectSample(Effect.succeedNow(sample))
}
