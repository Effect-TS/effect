/**
 * A generator of integers. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops anyInt
 * @category constructors
 * @since 1.0.0
 */
export const anyInt: Gen<never, number> = Gen.fromEffectSample(
  Random.nextInt.map(Sample.shrinkFractional(0))
)
