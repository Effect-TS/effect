import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Sample.Ops shrinkIntegral
 * @category constructors
 * @since 1.0.0
 */
export function shrinkIntegral(smallest: number) {
  return (a: number): Sample<never, number> =>
    Sample.unfold(a, (max) => [
      max,
      Stream.unfold(smallest, (min) => {
        const mid = min + ((max - min) / 2 | 0)
        if (mid === max) {
          return Option.none
        } else if (Math.abs(max - mid) === 1) {
          return Option.some([mid, max])
        } else {
          return Option.some([mid, mid])
        }
      })
    ])
}
