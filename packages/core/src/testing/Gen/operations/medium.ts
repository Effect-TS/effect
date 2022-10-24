import { clamp } from "@effect/core/testing/_internal/math"

/**
 * A sized generator that uses an exponential distribution of size values. The
 * majority of sizes will be towards the lower end of the range but some
 * larger sizes will be generated as well.
 *
 * @tsplus static effect/core/testing/Gen.Ops medium
 * @category constructors
 * @since 1.0.0
 */
export function medium<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<R | Sized, A> {
  const gen = Do(($) => {
    const max = $(Gen.size)
    const n = $(Gen.exponential)
    return clamp(Math.round((n * max) / 10.0), min, max)
  })
  return gen.reshrink(Sample.shrinkIntegral(min)).flatMap(f)
}
