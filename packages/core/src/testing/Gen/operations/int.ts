import type { NumberConstraints } from "@effect/core/testing/Gen/definition"

/**
 * A generator of integers inside the specified range: [start, end]. The
 * shrinker will shrink toward the lower end of the range ("smallest").
 *
 * @tsplus static effect/core/testing/Gen.Ops int
 * @category constructors
 * @since 1.0.0
 */
export function int(constraints: NumberConstraints = {}): Gen<never, number> {
  return Gen.fromEffectSample(
    Effect.suspendSucceed(() => {
      const min = constraints.min ?? Number.MIN_SAFE_INTEGER
      const max = constraints.max ?? Number.MAX_SAFE_INTEGER
      return min > max || min < Number.MIN_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER ?
        Effect.dieSync(new IllegalArgumentException("invalid bounds")) :
        Random.nextIntBetween(min, max).map(Sample.shrinkIntegral(min))
    })
  )
}
