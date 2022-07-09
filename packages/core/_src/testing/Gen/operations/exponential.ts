/**
 * A generator of exponentially distributed doubles with mean `1`. The
 * shrinker will shrink toward `0`.
 *
 * @tsplus static effect/core/testing/Gen.Ops exponential
 */
export const exponential: Gen<never, number> = Gen.uniform().map(
  (n) => -Math.log(1 - n)
)
