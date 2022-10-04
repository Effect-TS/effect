/**
 * @tsplus static effect/core/testing/Sample.Ops shrinkBigInt
 */
export function shrinkBigInt(smallest: bigint) {
  return (a: bigint): Sample<never, bigint> =>
    Sample.unfold(a, (max) => [
      max,
      Stream.unfold(smallest, (min) => {
        const mid = min + (max - min) / BigInt(2)
        if (mid === max) {
          return Maybe.none
        } else if (bigIntAbs(max - mid) === BigInt(1)) {
          return Maybe.some([mid, max])
        } else {
          return Maybe.some([mid, mid])
        }
      })
    ])
}

function bigIntAbs(x: bigint): bigint {
  return x < BigInt(0) ? -x : x
}
