/**
 * A generator of integers. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops anyInt
 */
export const anyInt: Gen<never, number> = Gen.fromEffectSample(
  Random.nextInt.map(Sample.shrinkFractional(0))
)
