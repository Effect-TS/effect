import * as Option from "@fp-ts/data/Option"

/**
 * @tsplus static effect/core/testing/Sample.Ops shrinkBigInt
 * @category constructors
 * @since 1.0.0
 */
export function shrinkBigInt(smallest: bigint) {
  return (a: bigint): Sample<never, bigint> =>
    Sample.unfold(a, (max) => [
      max,
      Stream.unfold(smallest, (min) => {
        const mid = min + (max - min) / BigInt(2)
        if (mid === max) {
          return Option.none
        } else if (bigIntAbs(max - mid) === BigInt(1)) {
          return Option.some([mid, max])
        } else {
          return Option.some([mid, mid])
        }
      })
    ])
}

function bigIntAbs(x: bigint): bigint {
  return x < BigInt(0) ? -x : x
}
