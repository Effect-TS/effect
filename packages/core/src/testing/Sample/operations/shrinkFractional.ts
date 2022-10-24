import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Sample.Ops shrinkFractional
 * @category constructors
 * @since 1.0.0
 */
export function shrinkFractional(smallest: number) {
  return (a: number): Sample<never, number> =>
    Sample.unfold(a, (max) => [
      max,
      Stream.unfold(smallest, (min) => {
        const mid = min + (max - min) / 2
        if (mid === max) {
          return Option.none
        } else if (Math.abs(max - mid) < 0.001) {
          return Option.some([min, max])
        } else {
          return Option.some([mid, mid])
        }
      })
    ])
}
