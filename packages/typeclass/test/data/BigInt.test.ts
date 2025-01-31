import * as BigintInstances from "@effect/typeclass/data/BigInt"
import { describe, it } from "@effect/vitest"
import * as U from "../util.js"

describe.concurrent("Bigint", () => {
  it("SemigroupMultiply", () => {
    const S = BigintInstances.SemigroupMultiply
    U.deepStrictEqual(S.combine(2n, 3n), 6n)
    U.deepStrictEqual(S.combineMany(1n, [1n, 2n, 3n]), 6n)
    U.deepStrictEqual(S.combineMany(1n, [1n, 0n, 3n]), 0n)
    U.deepStrictEqual(S.combineMany(0n, [1n, 2n, 3n]), 0n)
  })
})
