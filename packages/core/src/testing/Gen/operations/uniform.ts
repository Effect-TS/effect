/**
 * A generator of uniformly distributed doubles between [0, 1]. The shrinker
 * will shrink toward `0`.
 *
 * @tsplus static effect/core/testing/Gen.Ops uniform
 * @category constructors
 * @since 1.0.0
 */
export function uniform(): Gen<never, number> {
  return Gen.fromEffectSample(Random.next.map(Sample.shrinkFractional(0)))
}
