/**
 * A generator of doubles. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops anyDouble
 * @category constructors
 * @since 1.0.0
 */
export const anyDouble: Gen<never, number> = Gen.fromEffectSample(
  Random.next.map(Sample.shrinkFractional(0))
)
